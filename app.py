import os
import sys
import tempfile
import uuid
import json
import time
import re
from pathlib import Path
from typing import Optional, List, Dict, Any
import shutil

import numpy as np
import torch
import torchaudio
from fastapi import FastAPI, HTTPException, Form, Response, File, UploadFile, Body, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import ffmpeg  # 用于音频格式转换
from enum import Enum

# 添加CosyVoice路径
COSYVOICE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "moshengAI_tts/CosyVoice")
sys.path.append(COSYVOICE_PATH)
sys.path.append(os.path.join(COSYVOICE_PATH, "third_party/Matcha-TTS"))

# 导入CosyVoice
from cosyvoice.cli.cosyvoice import CosyVoice2
from cosyvoice.utils.file_utils import load_wav

# 创建输出目录
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 创建客户端输出目录
CLIENT_OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "client_output")
os.makedirs(CLIENT_OUTPUT_DIR, exist_ok=True)

# 创建静态文件目录
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
os.makedirs(STATIC_DIR, exist_ok=True)

# 定义声音类型目录
VOICE_TYPES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "prompt_voice")

# 创建FastAPI应用
app = FastAPI(title="魔声AI语音合成API", description="基于CosyVoice2的语音合成API")

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
# 挂载输出目录为静态资源
app.mount("/output", StaticFiles(directory=OUTPUT_DIR), name="output")
app.mount("/client_output", StaticFiles(directory=CLIENT_OUTPUT_DIR), name="client_output")
app.mount("/prompt_voice", StaticFiles(directory=VOICE_TYPES_DIR), name="prompt_voice")

# 加载模型
print("正在加载CosyVoice2模型...")
model_path = os.path.join(COSYVOICE_PATH, "pretrained_models/CosyVoice2-0.5B")
cosyvoice = CosyVoice2(model_path, load_jit=False, load_trt=False, fp16=False)
print("模型加载成功！")

# 加载示例音频作为提示
# PROMPT_PATH = os.path.join(COSYVOICE_PATH, "asset/zero_shot_prompt.wav")
# PROMPT_PATH = os.path.join(COSYVOICE_PATH, "asset/quanyoujiaju.wav") # 全友家居年货节，家具买一万送8999元，定制衣柜、整体橱柜，沙发，床垫，软床，成品家具，一站式购齐，地址:南屏首座二楼永辉超市楼上，全友家居。电话18859826481
# PROMPT_PATH = os.path.join(COSYVOICE_PATH, "asset/qiaodantiyu.mp3") #乔丹体育盛大开业，全场鞋服四折起，精选款运动鞋买一送一，进店选购更有好礼相送！
PROMPT_PATH = os.path.join(COSYVOICE_PATH, "asset/haoa.mp3") # 好啊，没想到你还真能把我造出来，欢迎加入欧比组织，谱姈，这是命令，好了，亲爱的，别伤心了，来抱一抱，好了，亲爱的，别伤心了，来抱一抱
PROMPT_PATH = os.path.join(COSYVOICE_PATH, "asset/pijiu.mp3") # 津喜熊猫鲜酿啤酒，全粮、山泉水精酿，全程低温0一4℃保存冰爽口感，精酿中的劳斯莱斯，零添加更健康，多元化口味刚好微醺，多元化口味刚好微醺
# PROMPT_PATH = os.path.join(COSYVOICE_PATH, "asset/toulan_26s.mp3") # Please select your corresponding gray color according to the screen color distribution, You can get points by stepping on your own color square.When the red bomb appears, you can step on your own color square first, and then activate the bomb to eliminate the opponent's color square. Note that the color square eliminated by the bomb will deduct the corresponding score.

if os.path.exists(PROMPT_PATH):
    prompt_speech_16k = load_wav(PROMPT_PATH, 16000)
    print(f"已加载提示音频: {PROMPT_PATH}")
else:
    print(f"警告: 提示音频文件不存在: {PROMPT_PATH}")
    # 创建一个空的提示音频
    prompt_speech_16k = torch.zeros(16000)

# 定义长文本阈值和分割参数
MAX_TEXT_LENGTH = 100  # 每段最大字符数
# 中文分割符号
CHINESE_SPLIT_CHARS = ["。", "！", "？", "；", "，", "、"]
# 英文分割符号
ENGLISH_SPLIT_CHARS = [".", "!", "?", ";", ",", ":", "-", ")"]
# 通用分割符号
COMMON_SPLIT_CHARS = [".", "!", "?", ";", ","]

class TTSRequest(BaseModel):
    text: str
    voice_type: str = "默认"

class SavedAudio(BaseModel):
    id: str
    text: str
    timestamp: str
    audio_path: str
    audio_url: str
    
# 保存的已确认音频记录
SAVED_AUDIOS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "saved_audios.json")

def load_saved_audios() -> List[Dict[str, Any]]:
    """加载保存的音频记录"""
    if os.path.exists(SAVED_AUDIOS_FILE):
        with open(SAVED_AUDIOS_FILE, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

def save_audio_record(audio_record: Dict[str, Any]):
    """保存音频记录到JSON文件"""
    saved_audios = load_saved_audios()
    saved_audios.append(audio_record)
    with open(SAVED_AUDIOS_FILE, 'w', encoding='utf-8') as f:
        json.dump(saved_audios, f, ensure_ascii=False, indent=2)

def is_chinese_text(text: str) -> bool:
    """
    判断文本是否主要由中文组成
    
    Args:
        text: 需要判断的文本
        
    Returns:
        如果文本主要由中文组成则返回True，否则返回False
    """
    # 中文字符的Unicode范围大致是\u4e00-\u9fff
    chinese_chars = re.findall(r'[\u4e00-\u9fff]', text)
    # 如果中文字符占比超过30%，则认为是中文文本
    return len(chinese_chars) / len(text) > 0.3 if text else False

def split_text(text: str, max_length: int = MAX_TEXT_LENGTH) -> List[str]:
    """
    智能分割文本，根据文本语言选择不同的分割策略
    
    Args:
        text: 要分割的文本
        max_length: 每段最大字符数
        
    Returns:
        分割后的文本段落列表
    """
    if len(text) <= max_length:
        return [text]
    
    # 判断文本主要语言
    is_chinese = is_chinese_text(text)
    print(f"检测到{'中文' if is_chinese else '英文'}文本")
    
    if is_chinese:
        return split_chinese_text(text, max_length)
    else:
        return split_english_text(text, max_length)

def split_chinese_text(text: str, max_length: int) -> List[str]:
    """
    按中文标点符号和字符长度分割中文文本
    
    Args:
        text: 要分割的中文文本
        max_length: 每段最大字符数
        
    Returns:
        分割后的文本段落列表
    """
    segments = []
    start = 0
    
    while start < len(text):
        # 如果剩余文本长度小于最大长度，直接添加
        if start + max_length >= len(text):
            segments.append(text[start:])
            break
        
        # 在最大长度范围内查找分割点
        end = start + max_length
        split_pos = -1
        
        # 尝试在标点符号处分割
        for char in CHINESE_SPLIT_CHARS:
            pos = text.rfind(char, start, end)
            if pos > split_pos:
                split_pos = pos
        
        # 如果找不到合适的中文分割点，尝试通用分割符
        if split_pos == -1 or split_pos <= start:
            for char in COMMON_SPLIT_CHARS:
                pos = text.rfind(char, start, end)
                if pos > split_pos:
                    split_pos = pos
        
        # 如果仍找不到合适的分割点，就在最大长度处强制分割
        if split_pos == -1 or split_pos <= start:
            segments.append(text[start:end])
            start = end
        else:
            # 包含分割符号
            segments.append(text[start:split_pos+1])
            start = split_pos + 1
    
    return segments

def split_english_text(text: str, max_length: int) -> List[str]:
    """
    按英文句子或短语边界分割英文文本
    
    Args:
        text: 要分割的英文文本
        max_length: 每段最大字符数
        
    Returns:
        分割后的文本段落列表
    """
    segments = []
    start = 0
    
    while start < len(text):
        # 如果剩余文本长度小于最大长度，直接添加
        if start + max_length >= len(text):
            segments.append(text[start:])
            break
        
        end = start + max_length
        
        # 1. 尝试在句子边界分割 (., !, ?)
        # 先查找句号、感叹号和问号
        sentence_end = -1
        for end_char in ['.', '!', '?']:
            # 找到这些符号后面跟着空格或引号的位置
            for match in re.finditer(f'\\{end_char}[ "\']', text[start:end]):
                pos = start + match.start()
                if pos > sentence_end:
                    sentence_end = pos
        
        if sentence_end > start:
            # 找到句子边界，包括标点符号
            segments.append(text[start:sentence_end+1])
            start = sentence_end + 1
            # 跳过可能的空格
            while start < len(text) and text[start].isspace():
                start += 1
            continue
        
        # 2. 尝试在从句或短语边界分割 (,, ;, :, -)
        phrase_end = -1
        for end_char in [',', ';', ':', '-', ')']:
            pos = text.rfind(end_char, start, end)
            if pos > phrase_end:
                phrase_end = pos
        
        if phrase_end > start:
            # 找到短语边界，包括标点符号
            segments.append(text[start:phrase_end+1])
            start = phrase_end + 1
            # 跳过可能的空格
            while start < len(text) and text[start].isspace():
                start += 1
            continue
        
        # 3. 尝试在单词边界分割
        # 在最大长度之前找到最后一个单词边界（空格）
        word_end = text.rfind(' ', start, end)
        
        if word_end > start:
            # 找到单词边界
            segments.append(text[start:word_end])
            start = word_end + 1
        else:
            # 如果没有找到任何适合的分割点，只能强制分割
            # 但为了避免分割单词，我们向前查找直到找到单词起始处
            # 先向后找一个完整单词的结尾
            word_match = re.search(r'\b\w+\b', text[end:])
            if word_match and word_match.start() + end < len(text):
                segments.append(text[start:end + word_match.start()])
                start = end + word_match.start()
            else:
                # 实在没办法，只能按长度截断
                segments.append(text[start:end])
                start = end
    
    return segments

def concatenate_audio(audio_files: List[str], output_path: str):
    """
    拼接多个音频文件
    
    Args:
        audio_files: 音频文件路径列表
        output_path: 输出文件路径
        
    Returns:
        拼接后的音频文件路径
    """
    if len(audio_files) == 1:
        # 如果只有一个文件，直接复制
        shutil.copy(audio_files[0], output_path)
        return output_path
    
    # 加载所有音频文件
    waveforms = []
    sample_rate = None
    
    for audio_file in audio_files:
        waveform, sr = torchaudio.load(audio_file)
        waveforms.append(waveform)
        if sample_rate is None:
            sample_rate = sr
        elif sr != sample_rate:
            raise ValueError(f"音频采样率不一致: {sr} != {sample_rate}")
    
    # 拼接所有音频
    concatenated = torch.cat(waveforms, dim=1)
    
    # 保存拼接后的音频
    torchaudio.save(output_path, concatenated, sample_rate)
    
    return output_path

def convert_wav_to_mp3(wav_path: str, bitrate: str = "256k") -> str:
    """将WAV文件转换为MP3格式
    
    Args:
        wav_path: WAV文件路径
        bitrate: 比特率，默认为256k
        
    Returns:
        MP3文件路径
    """
    mp3_path = wav_path.replace(".wav", ".mp3")
    
    # 使用ffmpeg进行转换
    try:
        (
            ffmpeg
            .input(wav_path)
            .output(mp3_path, audio_bitrate=bitrate)
            .run(quiet=True, overwrite_output=True)
        )
        print(f"已将 {wav_path} 转换为 {mp3_path}")
        return mp3_path
    except Exception as e:
        print(f"转换音频格式失败: {str(e)}")
        raise e

def get_voice_types() -> Dict[str, List[str]]:
    """
    获取所有可用的声音类型
    
    Returns:
        Dict[str, List[str]]: 声音类型字典，key为性别（男声/女声），value为该性别下的所有声音列表
    """
    voice_types = {}
    
    # 遍历声音类型目录
    for gender in os.listdir(VOICE_TYPES_DIR):
        gender_path = os.path.join(VOICE_TYPES_DIR, gender)
        if os.path.isdir(gender_path) and gender in ["male", "female"]:
            voices = []
            # 遍历该性别目录下的所有wav文件
            for file in os.listdir(gender_path):
                if file.endswith(".wav") or file.endswith(".mp3"):
                    # 获取文件名（不含扩展名）作为声音标签
                    voice_label = os.path.splitext(file)[0]
                    voices.append(voice_label)
            # 将性别目录名转换为中文
            gender_cn = "男声" if gender == "male" else "女声"
            voice_types[gender_cn] = sorted(voices)
    
    return voice_types

def get_voice_path(gender: str, voice_label: str) -> tuple[str, str]:
    """
    获取指定声音类型的音频文件路径和对应的文本文件路径
    
    Args:
        gender: 性别（男声/女声）
        voice_label: 声音标签
        
    Returns:
        tuple[str, str]: (音频文件路径, 文本文件路径)
    """
    # 将中文性别转换为英文目录名
    gender_dir = "male" if gender in ["男声", "male"] else "female"
    
    # 构建完整的文件路径
    voice_path = os.path.join(VOICE_TYPES_DIR, gender_dir, f"{voice_label}.wav")
    text_path = os.path.join(VOICE_TYPES_DIR, gender_dir, f"{voice_label}.txt")
    
    # 检查文件是否存在
    if not os.path.exists(voice_path):
        raise HTTPException(status_code=404, detail=f"声音文件不存在: {voice_label}")
    if not os.path.exists(text_path):
        raise HTTPException(status_code=404, detail=f"声音文本文件不存在: {voice_label}")
    
    return voice_path, text_path

def load_voice_prompt(voice_path: str, text_path: str) -> tuple[torch.Tensor, str]:
    """
    加载声音提示音频和对应的文本
    
    Args:
        voice_path: 音频文件路径
        text_path: 文本文件路径
        
    Returns:
        tuple[torch.Tensor, str]: (音频数据, 提示文本)
    """
    # 加载音频文件
    prompt_speech_16k = load_wav(voice_path, 16000)
    
    # 读取提示文本
    with open(text_path, 'r', encoding='utf-8') as f:
        prompt_text = f.read().strip()
    
    return prompt_speech_16k, prompt_text

@app.get("/")
async def root():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

@app.get("/voice_types")
async def get_available_voice_types():
    """获取所有可用的声音类型"""
    try:
        voice_types = get_voice_types()
        return JSONResponse({
            "success": True,
            "voice_types": voice_types
        })
    except Exception as e:
        print(f"获取声音类型失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取声音类型失败: {str(e)}")

# == 新增: 任务状态管理 ==
class TaskState(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"

# 全局任务存储（简单内存版）
SYNTHESIS_TASKS: Dict[str, Dict[str, Any]] = {}


def _run_synthesis_task(task_id: str, text: str, gender: str, voice_label: str):
    """后台执行真正的语音合成，并更新任务状态"""
    global SYNTHESIS_TASKS
    task_ref = SYNTHESIS_TASKS.get(task_id)
    if not task_ref:  # 任务可能已被删除
        return
    task_ref["status"] = TaskState.processing
    try:
        # ======= 以下逻辑复用原 /synthesize 的核心部分 =======
        # 获取声音文件路径和文本文件路径
        voice_path, text_path = get_voice_path(gender, voice_label)
        # 加载声音提示
        prompt_speech_16k, prompt_text = load_voice_prompt(voice_path, text_path)
        # 生成唯一文件名
        output_id = uuid.uuid4()
        final_output_path = os.path.join(OUTPUT_DIR, f"{output_id}.wav")
        # 分割长文本
        text_segments = split_text(text)
        temp_audio_files = []
        for i, segment in enumerate(text_segments):
            temp_output_path = os.path.join(OUTPUT_DIR, f"{output_id}_part{i}.wav")
            for _, result in enumerate(cosyvoice.inference_zero_shot(segment, prompt_text, prompt_speech_16k, stream=False)):
                tts_speech = result['tts_speech']
                torchaudio.save(temp_output_path, tts_speech, cosyvoice.sample_rate)
                break
            temp_audio_files.append(temp_output_path)
        # 拼接
        if len(temp_audio_files) > 1:
            concatenate_audio(temp_audio_files, final_output_path)
        else:
            final_output_path = temp_audio_files[0]
        # 转 MP3
        mp3_path = convert_wav_to_mp3(final_output_path)
        mp3_filename = os.path.basename(mp3_path)
        wav_filename = os.path.basename(final_output_path)
        # 删除段文件
        if len(temp_audio_files) > 1:
            for tmp in temp_audio_files:
                try:
                    os.remove(tmp)
                except Exception:
                    pass
        # 更新完成状态和结果
        task_ref["status"] = TaskState.completed
        task_ref["result"] = {
            "success": True,
            "message": "语音合成成功",
            "wav_url": f"/output/{wav_filename}",
            "mp3_url": f"/output/{mp3_filename}",
            "text": text
        }
    except Exception as e:
        task_ref["status"] = TaskState.failed
        task_ref["error"] = str(e)


# == 修改 /synthesize 接口 ==
@app.post("/synthesize")
async def synthesize(
    background_tasks: BackgroundTasks,
    text: str = Form(...),
    gender: str = Form(...),
    voice_label: str = Form(...),
):
    """异步语音合成：立即返回 202 并在后台执行任务"""
    try:
        task_id = str(uuid.uuid4())
        SYNTHESIS_TASKS[task_id] = {
            "status": TaskState.pending,
            "result": None,
            "error": None
        }
        # 将耗时任务加入后台
        background_tasks.add_task(_run_synthesis_task, task_id, text, gender, voice_label)
        # 返回 202 与任务信息
        return JSONResponse(
            {
                "task_id": task_id,
                "status": TaskState.pending,
                "status_url": f"/synthesis_tasks/{task_id}/status"
            },
            status_code=202,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"无法创建合成任务: {str(e)}")


# == 任务状态查询接口 ==
@app.get("/synthesis_tasks/{task_id}/status")
async def get_synthesis_task_status(task_id: str):
    task = SYNTHESIS_TASKS.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task

@app.post("/confirm_script")
async def confirm_script(
    text: str = Body(...),
    gender: str = Body(...),
    voice_label: str = Body(...),
    user_id: str = Body(None),
    session_id: str = Body(None)
):
    """
    确认脚本并生成最终音频
    
    参数:
    - text: 已确认的文本脚本
    - gender: 性别（男声/女声）
    - voice_label: 声音标签
    - user_id: 用户ID（可选）
    - session_id: 会话ID（可选）
    
    返回:
    - 最终音频文件URL
    """
    try:
        print(f"收到脚本确认请求: '{text}', 性别: {gender}, 声音: {voice_label}")
        
        # 获取声音文件路径和文本文件路径
        voice_path, text_path = get_voice_path(gender, voice_label)
        
        # 加载声音提示
        prompt_speech_16k, prompt_text = load_voice_prompt(voice_path, text_path)
        
        # 生成唯一文件名和ID
        audio_id = str(uuid.uuid4())
        final_wav_path = os.path.join(CLIENT_OUTPUT_DIR, f"{audio_id}.wav")
        
        # 分割长文本
        text_segments = split_text(text)
        print(f"文本已分割为{len(text_segments)}段")
        
        # 临时音频文件路径列表
        temp_audio_files = []
        
        # 逐段合成语音
        for i, segment in enumerate(text_segments):
            print(f"开始合成第{i+1}/{len(text_segments)}段: '{segment}'")
            
            # 临时文件路径
            temp_output_path = os.path.join(CLIENT_OUTPUT_DIR, f"{audio_id}_part{i}.wav")
            
            # 合成语音
            for j, result in enumerate(cosyvoice.inference_zero_shot(segment, prompt_text, prompt_speech_16k, stream=False)):
                tts_speech = result['tts_speech']
                torchaudio.save(temp_output_path, tts_speech, cosyvoice.sample_rate)
                print(f"已保存第{i+1}段语音文件: {temp_output_path}")
                break  # 只保存第一个结果
            
            temp_audio_files.append(temp_output_path)
        
        # 拼接所有音频段
        if len(temp_audio_files) > 1:
            print(f"正在拼接{len(temp_audio_files)}个音频文件...")
            concatenate_audio(temp_audio_files, final_wav_path)
            print(f"已拼接所有音频段: {final_wav_path}")
        else:
            # 单段音频直接使用
            final_wav_path = temp_audio_files[0]
        
        # 转换为MP3格式
        mp3_path = convert_wav_to_mp3(final_wav_path)
        mp3_filename = os.path.basename(mp3_path)
        wav_filename = os.path.basename(final_wav_path)
        
        # 删除临时文件
        if len(temp_audio_files) > 1:
            for temp_file in temp_audio_files:
                try:
                    os.remove(temp_file)
                    print(f"已删除临时文件: {temp_file}")
                except Exception as e:
                    print(f"删除临时文件失败: {str(e)}")
        
        # 创建记录
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        audio_record = {
            "id": audio_id,
            "text": text,
            "timestamp": timestamp,
            "wav_path": final_wav_path,
            "mp3_path": mp3_path,
            "wav_url": f"/client_output/{wav_filename}",
            "mp3_url": f"/client_output/{mp3_filename}",
            "user_id": user_id,
            "session_id": session_id,
            "gender": gender,
            "voice_label": voice_label
        }
        
        # 保存记录
        save_audio_record(audio_record)
        
        return JSONResponse({
            "success": True,
            "message": "脚本已确认并生成最终音频",
            "audio_id": audio_id,
            "wav_url": f"/client_output/{wav_filename}",
            "mp3_url": f"/client_output/{mp3_filename}",
            "text": text,
            "timestamp": timestamp
        })
    except Exception as e:
        print(f"确认脚本过程中出错: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"确认脚本失败: {str(e)}")

@app.get("/saved_audios")
async def get_saved_audios():
    """获取所有已保存的音频记录"""
    try:
        saved_audios = load_saved_audios()
        return JSONResponse({
            "success": True,
            "saved_audios": saved_audios
        })
    except Exception as e:
        print(f"获取已保存音频记录失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取已保存音频记录失败: {str(e)}")

@app.get("/health")
async def health_check():
    """健康检查端点"""
    return JSONResponse({
        "status": "ok",
        "message": "TTS服务正常运行"
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080) 
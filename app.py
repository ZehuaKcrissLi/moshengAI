import os
import sys
import tempfile
import uuid
import json
import time
import subprocess  # 添加subprocess模块
from pathlib import Path
from typing import Optional, List, Dict, Any

import numpy as np
import torch
import torchaudio
from fastapi import FastAPI, HTTPException, Form, Response, File, UploadFile, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
# import ffmpeg  # 用于音频格式转换 - 注释掉，改用subprocess调用系统ffmpeg

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

# 创建FastAPI应用
app = FastAPI(title="魔声AI语音合成API", description="基于CosyVoice2的语音合成API")

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
# 挂载输出目录为静态资源
app.mount("/output", StaticFiles(directory=OUTPUT_DIR), name="output")
app.mount("/client_output", StaticFiles(directory=CLIENT_OUTPUT_DIR), name="client_output")

# 加载模型
print("正在加载CosyVoice2模型...")
model_path = os.path.join(COSYVOICE_PATH, "pretrained_models/CosyVoice2-0.5B")
cosyvoice = CosyVoice2(model_path, load_jit=False, load_trt=False, fp16=False)
print("模型加载成功！")

# 加载示例音频作为提示
# PROMPT_PATH = os.path.join(COSYVOICE_PATH, "asset/zero_shot_prompt.wav")
PROMPT_PATH = os.path.join(COSYVOICE_PATH, "asset/quanyoujiaju.wav")
if os.path.exists(PROMPT_PATH):
    prompt_speech_16k = load_wav(PROMPT_PATH, 16000)
    print(f"已加载提示音频: {PROMPT_PATH}")
else:
    print(f"警告: 提示音频文件不存在: {PROMPT_PATH}")
    # 创建一个空的提示音频
    prompt_speech_16k = torch.zeros(16000)

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

def convert_wav_to_mp3(wav_path: str, bitrate: str = "256k") -> str:
    """将WAV文件转换为MP3格式
    
    Args:
        wav_path: WAV文件路径
        bitrate: 比特率，默认为256k
        
    Returns:
        MP3文件路径
    """
    mp3_path = wav_path.replace(".wav", ".mp3")
    
    # 使用subprocess调用系统ffmpeg命令
    try:
        cmd = ["ffmpeg", "-i", wav_path, "-b:a", bitrate, "-y", mp3_path]
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print(f"已将 {wav_path} 转换为 {mp3_path}")
        return mp3_path
    except Exception as e:
        print(f"转换音频格式失败: {str(e)}")
        raise e

@app.get("/")
async def root():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

@app.post("/synthesize")
async def synthesize(text: str = Form(...), voice_type: str = Form("默认")):
    """
    将文本转换为语音
    
    参数:
    - text: 要合成的文本
    - voice_type: 声音类型，默认为"默认"
    
    返回:
    - 语音文件
    """
    try:
        print(f"收到合成请求: '{text}', 声音类型: {voice_type}")
        
        # 生成唯一文件名
        output_filename = f"{uuid.uuid4()}.wav"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        
        # 合成语音
        # 使用zero_shot模式而不是sft模式
        for i, result in enumerate(cosyvoice.inference_zero_shot(text, "全友家居年货节，家具买一万送8999元，定制衣柜、整体橱柜，沙发，床垫，软床，成品家具，一站式购齐，地址:南屏首座二楼永辉超市楼上，全友家居。", prompt_speech_16k, stream=False)):
            tts_speech = result['tts_speech']
            torchaudio.save(output_path, tts_speech, cosyvoice.sample_rate)
            print(f"已保存语音文件: {output_path}")
            break  # 只保存第一个结果
        
        # 转换为MP3格式
        mp3_path = convert_wav_to_mp3(output_path)
        mp3_filename = os.path.basename(mp3_path)
        
        # 返回WAV和MP3文件的URL
        return JSONResponse({
            "success": True,
            "message": "语音合成成功",
            "wav_url": f"/output/{output_filename}",
            "mp3_url": f"/output/{mp3_filename}",
            "text": text
        })
    except Exception as e:
        print(f"合成过程中出错: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"语音合成失败: {str(e)}")

@app.post("/tts/confirm_script")
async def confirm_script(
    text: str = Body(...),
    user_id: str = Body(None),
    session_id: str = Body(None)
):
    """
    确认脚本并生成最终音频
    
    参数:
    - text: 已确认的文本脚本
    - user_id: 用户ID（可选）
    - session_id: 会话ID（可选）
    
    返回:
    - 最终音频文件URL
    """
    try:
        print(f"收到脚本确认请求: '{text}'")
        
        # 生成唯一文件名和ID
        audio_id = str(uuid.uuid4())
        wav_filename = f"{audio_id}.wav"
        wav_path = os.path.join(CLIENT_OUTPUT_DIR, wav_filename)
        
        # 合成语音
        for i, result in enumerate(cosyvoice.inference_zero_shot(text, "全友家居年货节，家具买一万送8999元，定制衣柜、整体橱柜，沙发，床垫，软床，成品家具，一站式购齐，地址:南屏首座二楼永辉超市楼上，全友家居。", prompt_speech_16k, stream=False)):
            tts_speech = result['tts_speech']
            torchaudio.save(wav_path, tts_speech, cosyvoice.sample_rate)
            print(f"已保存最终语音文件: {wav_path}")
            break  # 只保存第一个结果
        
        # 转换为MP3格式
        mp3_path = convert_wav_to_mp3(wav_path)
        mp3_filename = os.path.basename(mp3_path)
        
        # 创建记录
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        audio_record = {
            "id": audio_id,
            "text": text,
            "timestamp": timestamp,
            "wav_path": wav_path,
            "mp3_path": mp3_path,
            "wav_url": f"/client_output/{wav_filename}",
            "mp3_url": f"/client_output/{mp3_filename}",
            "user_id": user_id,
            "session_id": session_id
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

@app.get("/tts/saved_audios")
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080) 
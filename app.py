import os
import sys
import tempfile
import uuid
from pathlib import Path
from typing import Optional

import numpy as np
import torch
import torchaudio
from fastapi import FastAPI, HTTPException, Form, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

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

# 创建静态文件目录
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
os.makedirs(STATIC_DIR, exist_ok=True)

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

@app.get("/")
async def root():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

@app.post("/synthesize")
async def synthesize(text: str = Form(...), voice_type: str = Form("促销")):
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
        
        # 返回语音文件
        return FileResponse(
            output_path,
            media_type="audio/wav",
            filename=output_filename
        )
    except Exception as e:
        print(f"合成过程中出错: {str(e)}")
        raise HTTPException(status_code=500, detail=f"语音合成失败: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080) 
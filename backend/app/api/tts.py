from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any
import os
import requests
import json
from pydantic import BaseModel
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# TTS服务URL
TTS_SERVICE_URL = os.environ.get("TTS_SERVICE_URL", "http://localhost:8080")

class ScriptConfirmRequest(BaseModel):
    text: str
    user_id: str = None
    session_id: str = None
    
@router.post("/synthesize")
async def synthesize_text(
    text: str = Body(...),
    user_id: str = Body(None),
    session_id: str = Body(None)
):
    """
    发送文本到TTS服务进行合成
    
    参数:
    - text: 要合成的文本
    - user_id: 用户ID（可选）
    - session_id: 会话ID（可选）
    
    返回:
    - TTS服务的响应
    """
    try:
        logger.info(f"发送合成请求到TTS服务: '{text}'")
        
        # 调用TTS服务的synthesize接口
        response = requests.post(
            f"{TTS_SERVICE_URL}/synthesize",
            data={"text": text, "voice_type": "默认"}
        )
        
        if response.status_code != 200:
            logger.error(f"TTS服务错误: {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"TTS服务错误: {response.text}")
        
        result = response.json()
        logger.info(f"TTS服务合成成功: {result}")
        
        # 添加前缀，确保URL可访问
        if "mp3_url" in result:
            result["mp3_url"] = f"{TTS_SERVICE_URL}{result['mp3_url']}"
        if "wav_url" in result:
            result["wav_url"] = f"{TTS_SERVICE_URL}{result['wav_url']}"
            
        return result
    except Exception as e:
        logger.exception(f"合成过程中出错: {str(e)}")
        raise HTTPException(status_code=500, detail=f"合成过程中出错: {str(e)}")

@router.post("/confirm_script")
async def confirm_script(request: ScriptConfirmRequest):
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
        logger.info(f"发送脚本确认请求到TTS服务: '{request.text}'")
        
        # 调用TTS服务的confirm_script接口
        response = requests.post(
            f"{TTS_SERVICE_URL}/confirm_script",
            json={
                "text": request.text,
                "user_id": request.user_id,
                "session_id": request.session_id
            }
        )
        
        if response.status_code != 200:
            logger.error(f"TTS服务错误: {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"TTS服务错误: {response.text}")
        
        result = response.json()
        logger.info(f"TTS服务确认脚本成功: {result}")
        
        # 添加前缀，确保URL可访问
        if "mp3_url" in result:
            result["mp3_url"] = f"{TTS_SERVICE_URL}{result['mp3_url']}"
        if "wav_url" in result:
            result["wav_url"] = f"{TTS_SERVICE_URL}{result['wav_url']}"
            
        return result
    except Exception as e:
        logger.exception(f"确认脚本过程中出错: {str(e)}")
        raise HTTPException(status_code=500, detail=f"确认脚本过程中出错: {str(e)}")

@router.get("/saved_audios")
async def get_saved_audios():
    """获取所有已保存的音频记录"""
    try:
        logger.info(f"获取已保存音频记录")
        
        # 调用TTS服务的saved_audios接口
        response = requests.get(f"{TTS_SERVICE_URL}/saved_audios")
        
        if response.status_code != 200:
            logger.error(f"TTS服务错误: {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"TTS服务错误: {response.text}")
        
        result = response.json()
        
        # 处理URL前缀
        if "saved_audios" in result:
            for audio in result["saved_audios"]:
                if "mp3_url" in audio:
                    audio["mp3_url"] = f"{TTS_SERVICE_URL}{audio['mp3_url']}"
                if "wav_url" in audio:
                    audio["wav_url"] = f"{TTS_SERVICE_URL}{audio['wav_url']}"
        
        return result
    except Exception as e:
        logger.exception(f"获取已保存音频记录失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取已保存音频记录失败: {str(e)}") 
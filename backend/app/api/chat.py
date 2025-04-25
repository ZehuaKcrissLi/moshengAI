from fastapi import APIRouter, HTTPException, Body
import httpx
import os
from typing import List, Dict, Any, Optional
import json
import logging

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

DEEPSEEK_API_KEY = "sk-cd33591640b74e3cadbcb3407ac0c298"
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

# 魔声AI的系统提示
SYSTEM_PROMPT = """你是魔声AI，一个专业的AI配音助手。你专门帮助用户生成高质量的商业英文配音。

你的能力包括：
1. 根据用户需求生成专业的英文脚本
2. 提供多种中文口音选择（普通话、四川话等）
3. 提供多种语音风格（专业、友好、热情等）
4. 生成自然流畅的英文配音
5. 根据脚本长度和复杂度调整语速和语调

在对话中，你应该：
- 首先询问用户的配音需求，包括主题、目标受众、风格等
- 根据用户提供的中文内容，生成地道的英文脚本
- 允许用户修改和调整脚本
- 提供适合的口音和风格建议
- 最终生成高质量的音频文件

你的生成内容中不要有**，这些符号，你的生成内容应该保持plain text风格，这样好让用户复制粘贴成配音文案。
如果是配音文案，你生成的内容中就必须只包含配音文案的纯文本，不要包含任何其他内容！
请始终保持专业、友好和有帮助的态度，确保用户获得最佳的配音体验。"""

@router.post("/chat")
async def chat_with_deepseek(
    messages: List[Dict[str, str]] = Body(...),
    temperature: Optional[float] = Body(0.7),
    max_tokens: Optional[int] = Body(2000)
):
    """
    与DeepSeek API通信的聊天端点
    """
    try:
        # 打印接收到的消息以便调试
        logger.info(f"接收到的消息: {messages}")
        
        # 添加系统提示作为第一条消息（如果尚未存在）
        if not messages or messages[0].get("role") != "system":
            messages.insert(0, {"role": "system", "content": SYSTEM_PROMPT})
        
        payload = {
            "model": "deepseek-chat",
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False
        }
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
        }
        
        logger.info(f"发送请求到DeepSeek API")
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                DEEPSEEK_API_URL,
                json=payload,
                headers=headers
            )
            
            logger.info(f"DeepSeek API响应状态码: {response.status_code}")
            
            # 保存完整响应以便调试
            response_text = response.text
            logger.info(f"DeepSeek API原始响应: {response_text}")
            
            if response.status_code != 200:
                error_detail = response_text
                try:
                    error_json = response.json()
                    if "error" in error_json:
                        error_detail = error_json["error"].get("message", error_detail)
                except:
                    pass
                
                logger.error(f"DeepSeek API错误: {error_detail}")
                
                # 如果API密钥无效或额度不足，返回特定错误消息
                if "API key" in error_detail or "authentication" in error_detail.lower() or "insufficient" in error_detail.lower():
                    raise HTTPException(
                        status_code=402,
                        detail="DeepSeek API密钥无效或额度不足，请检查您的API密钥或充值账户。"
                    )
                
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"DeepSeek API错误: {error_detail}"
                )
            
            result = response.json()
            logger.info(f"处理后的结果: {result}")
            
            # 确保我们获得了正确的响应格式
            if "choices" not in result or not result["choices"]:
                logger.error("DeepSeek API响应格式错误: 缺少choices字段")
                raise HTTPException(
                    status_code=500,
                    detail="DeepSeek API响应格式错误"
                )
                
            # 返回实际的AI响应，而不是固定的欢迎语
            ai_message = result["choices"][0]["message"]["content"]
            
            return {
                "message": ai_message,
                "usage": result.get("usage", {})
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"处理聊天请求时发生错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"服务器错误: {str(e)}")


# 添加一个简单的健康检查端点
@router.get("/health")
async def health_check():
    return {"status": "ok", "message": "聊天服务正常运行"} 
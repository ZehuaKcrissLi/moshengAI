from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import os
from .api import router as api_router

app = FastAPI(title="魔声AI API", description="AI商业英文配音服务")

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源，在生产环境中应该限制为实际前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册API路由
app.include_router(api_router, prefix="/api")

# 定义数据模型
class TextToSpeechRequest(BaseModel):
    text: str
    accent: str = "美式口音"  # 默认美式口音
    voice_style: Optional[str] = None

class AudioPreviewResponse(BaseModel):
    preview_id: str
    audio_url: str
    accent: str
    voice_style: str

# 挂载静态文件目录
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(current_dir)) # 获取项目根目录 (backend的上级)

static_folder = os.path.join(project_root, "frontend/public/static") # 假设静态资源在 frontend/public/static
prompt_voice_folder = os.path.join(project_root, "prompt_voice") # 音色库目录

if os.path.exists(static_folder):
    print(f"Mounting static folder: {static_folder}")
    app.mount("/static", StaticFiles(directory=static_folder), name="static")
else:
    print(f"Static folder not found: {static_folder}")

if os.path.exists(prompt_voice_folder):
    print(f"Mounting prompt voice folder: {prompt_voice_folder}")
    app.mount("/prompt_voice", StaticFiles(directory=prompt_voice_folder), name="prompt_voice") # 添加挂载
else:
    print(f"Prompt voice folder not found: {prompt_voice_folder}")

@app.get("/")
def read_root():
    return {"message": "欢迎使用魔声AI - AI商业多语言配音服务"}

@app.post("/api/audio-previews", response_model=List[AudioPreviewResponse])
async def generate_audio_previews(request: TextToSpeechRequest):
    """生成音频预览"""
    # 这里将来会实现实际的TTS API调用
    # 目前返回模拟数据
    previews = [
        AudioPreviewResponse(
            preview_id="preview1",
            audio_url="/static/samples/preview1.mp3",
            accent=request.accent,
            voice_style="专业"
        ),
        AudioPreviewResponse(
            preview_id="preview2",
            audio_url="/static/samples/preview2.mp3",
            accent=request.accent,
            voice_style="自然"
        )
    ]
    return previews

@app.post("/api/generate-script")
async def generate_script(prompt: str):
    """基于用户描述生成配音脚本"""
    # 这里将来会调用LLM API生成文案
    # 目前返回模拟数据
    return {
        "english_script": "This is a sample voiceover script generated based on your requirements.",
        "chinese_translation": "这是根据您的需求生成的示例配音脚本。"
    }

@app.post("/api/final-audio")
async def generate_final_audio(request: TextToSpeechRequest):
    """生成最终的配音音频"""
    # 这里将来会实现实际的TTS API调用生成最终音频
    # 目前返回模拟数据
    return {
        "audio_url": "/static/output/final_audio.mp3",
        "download_url": "/static/output/final_audio.mp3"
    }

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "服务正常运行"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True) 
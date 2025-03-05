from fastapi import APIRouter
from .voice import router as voice_router
from .chat import router as chat_router

router = APIRouter()
router.include_router(voice_router, prefix="/voice", tags=["voice"])
router.include_router(chat_router, prefix="/chat", tags=["chat"]) 
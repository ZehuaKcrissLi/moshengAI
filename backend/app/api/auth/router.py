from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional

from .models import UserRegister, UserLogin, SocialLogin, GoogleLogin, LoginResponse
from .service import register_user, login_user, wechat_login, google_login, get_current_user

router = APIRouter(tags=["认证"])

# 添加一个简单的测试路由
@router.get("/test")
async def test_route():
    return {"message": "Auth API测试成功！"}

@router.post("/register", response_model=LoginResponse)
async def register(user_data: UserRegister):
    """
    用户注册
    """
    try:
        result = register_user(
            username=user_data.username,
            email=user_data.email,
            password=user_data.password
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=LoginResponse)
async def login(user_data: UserLogin):
    """
    用户登录
    """
    try:
        result = login_user(
            email=user_data.email,
            password=user_data.password
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.post("/wechat-login", response_model=LoginResponse)
async def wechat_login_route(login_data: SocialLogin):
    """
    微信登录
    """
    try:
        result = wechat_login(login_data.code)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.post("/google-login", response_model=LoginResponse)
async def google_login_route(login_data: GoogleLogin):
    """
    Google登录
    """
    try:
        # 打印接收到的请求数据
        print(f"接收到的Google登录数据: {login_data}")
        print(f"收到Google登录请求，授权码: {login_data.code[:10] if login_data.code else 'None'}...")
        result = google_login(login_data.code)
        print("Google登录成功")
        return result
    except ValueError as e:
        print(f"Google登录出错: {str(e)}")
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        print(f"Google登录异常: {str(e)}")
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")

@router.get("/me")
async def get_me(authorization: Optional[str] = Header(None)):
    """
    获取当前用户信息
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未提供有效的认证令牌")
    
    token = authorization.replace("Bearer ", "")
    user = get_current_user(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="认证令牌无效或已过期")
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "avatar": user.avatar,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    } 
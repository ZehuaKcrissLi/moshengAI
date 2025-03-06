from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import uuid4, UUID

# 用户模型
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    username: str
    email: EmailStr
    password: str
    avatar: Optional[str] = None
    google_id: Optional[str] = None
    wechat_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

# 用户注册请求模型
class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str

# 用户登录请求模型
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# 社交登录请求模型
class SocialLogin(BaseModel):
    code: str = Field(..., description="授权码")
    
# Google登录请求模型
class GoogleLogin(BaseModel):
    code: str = Field(..., description="Google授权码")

# 用户响应模型（不包含密码）
class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    avatar: Optional[str] = None
    created_at: datetime
    updated_at: datetime

# 登录响应模型
class LoginResponse(BaseModel):
    token: str
    user: UserResponse 
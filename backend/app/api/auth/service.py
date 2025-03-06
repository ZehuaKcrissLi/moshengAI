import os
import json
import hashlib
import jwt
import requests
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from uuid import uuid4

from .models import User, UserResponse

# 模拟数据库
users_db = {}

# JWT配置
JWT_SECRET = os.environ.get("JWT_SECRET", "your-secret-key")
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_MINUTES = 60 * 24  # 24小时

# 微信和Google OAuth配置
WECHAT_APP_ID = os.environ.get("WECHAT_APP_ID", "your-wechat-app-id")
WECHAT_APP_SECRET = os.environ.get("WECHAT_APP_SECRET", "your-wechat-app-secret")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "your-google-client-id")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "your-google-client-secret")

# 密码哈希
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# 验证密码
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

# 创建JWT令牌
def create_jwt_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(minutes=JWT_EXPIRES_MINUTES),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# 验证JWT令牌
def verify_jwt_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except jwt.PyJWTError:
        return None

# 获取当前用户
def get_current_user(token: str) -> Optional[User]:
    user_id = verify_jwt_token(token)
    if user_id and user_id in users_db:
        return users_db[user_id]
    return None

# 用户注册
def register_user(username: str, email: str, password: str) -> Dict[str, Any]:
    # 检查邮箱是否已存在
    for user in users_db.values():
        if user.email == email:
            raise ValueError("邮箱已被注册")
    
    # 创建新用户
    user_id = str(uuid4())
    new_user = User(
        id=user_id,
        username=username,
        email=email,
        password=hash_password(password),
    )
    
    # 保存用户
    users_db[user_id] = new_user
    
    # 创建令牌
    token = create_jwt_token(user_id)
    
    # 返回用户信息和令牌
    return {
        "token": token,
        "user": UserResponse(
            id=new_user.id,
            username=new_user.username,
            email=new_user.email,
            avatar=new_user.avatar,
            created_at=new_user.created_at,
            updated_at=new_user.updated_at,
        )
    }

# 用户登录
def login_user(email: str, password: str) -> Dict[str, Any]:
    # 查找用户
    user = None
    for u in users_db.values():
        if u.email == email:
            user = u
            break
    
    if not user or not verify_password(password, user.password):
        raise ValueError("邮箱或密码错误")
    
    # 创建令牌
    token = create_jwt_token(user.id)
    
    # 返回用户信息和令牌
    return {
        "token": token,
        "user": UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            avatar=user.avatar,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )
    }

# 微信登录
def wechat_login(code: str) -> Dict[str, Any]:
    # 获取微信访问令牌
    token_url = f"https://api.weixin.qq.com/sns/oauth2/access_token?appid={WECHAT_APP_ID}&secret={WECHAT_APP_SECRET}&code={code}&grant_type=authorization_code"
    response = requests.get(token_url)
    token_data = response.json()
    
    if "errcode" in token_data:
        raise ValueError(f"微信授权失败: {token_data.get('errmsg')}")
    
    access_token = token_data.get("access_token")
    openid = token_data.get("openid")
    
    # 获取用户信息
    user_info_url = f"https://api.weixin.qq.com/sns/userinfo?access_token={access_token}&openid={openid}"
    user_info_response = requests.get(user_info_url)
    user_info = user_info_response.json()
    
    if "errcode" in user_info:
        raise ValueError(f"获取微信用户信息失败: {user_info.get('errmsg')}")
    
    # 查找或创建用户
    user = None
    for u in users_db.values():
        if hasattr(u, "wechat_openid") and getattr(u, "wechat_openid") == openid:
            user = u
            break
    
    if not user:
        # 创建新用户
        user_id = str(uuid4())
        user = User(
            id=user_id,
            username=user_info.get("nickname", f"微信用户_{user_id[:6]}"),
            email=f"{openid}@wechat.user",  # 微信不提供邮箱，使用虚拟邮箱
            password=hash_password(str(uuid4())),  # 随机密码
            avatar=user_info.get("headimgurl"),
        )
        # 添加微信OpenID
        setattr(user, "wechat_openid", openid)
        users_db[user_id] = user
    
    # 创建令牌
    token = create_jwt_token(user.id)
    
    # 返回用户信息和令牌
    return {
        "token": token,
        "user": UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            avatar=user.avatar,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )
    }

# Google登录
def google_login(code: str) -> Dict[str, Any]:
    """
    处理Google OAuth授权码登录
    获取访问令牌，然后获取用户信息
    """
    print(f"Google登录开始处理, code={code[:10]}...")
    
    # Google OAuth配置
    client_id = "1080640002203-8llt2h00f9dbj5e7gd6t0rakh61b8ch1.apps.googleusercontent.com"
    client_secret = "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"  # 更新为正确的密钥
    redirect_uri = "http://localhost:5173/auth/google-callback"
    
    print(f"Google OAuth配置: client_id={client_id[:10]}..., redirect_uri={redirect_uri}")
    
    # 获取访问令牌
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code"
    }
    
    try:
        # 发送请求获取访问令牌
        print("发送Google令牌请求...")
        token_response = requests.post(token_url, data=token_data, headers={
            "Content-Type": "application/x-www-form-urlencoded"
        })
        
        status_code = token_response.status_code
        response_text = token_response.text
        print(f"Google令牌响应状态码: {status_code}")
        print(f"Google令牌响应内容: {response_text[:200]}...")
        
        if status_code != 200:
            error_info = token_response.json()
            print(f"Google令牌请求失败: {status_code}")
            print(f"响应内容: {error_info}")
            
            # 特殊处理invalid_grant错误(授权码已使用)
            if error_info.get("error") == "invalid_grant":
                raise ValueError("授权码已过期或已被使用，请重新登录")
            
            raise ValueError(f"Google授权码验证失败: {error_info}")
        
        token_info = token_response.json()
        access_token = token_info.get("access_token")
        
        if not access_token:
            print("响应中没有access_token")
            raise ValueError("未获取到有效的访问令牌")
            
        # 获取用户信息
        user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        user_info_response = requests.get(
            user_info_url,
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if user_info_response.status_code != 200:
            print(f"获取Google用户信息失败: {user_info_response.status_code}")
            print(f"响应内容: {user_info_response.text}")
            raise ValueError("获取Google用户信息失败")
            
        user_info = user_info_response.json()
        print(f"获取到Google用户信息: {user_info.get('email')}")
        
        # 从Google信息中获取关键用户数据
        google_id = user_info.get("id")
        email = user_info.get("email")
        name = user_info.get("name")
        picture = user_info.get("picture")
        
        if not (google_id and email):
            raise ValueError("Google用户信息不完整")
            
        # 查找用户或创建新用户
        user = None
        for u in users_db.values():
            if u.google_id == google_id:
                user = u
                break
            elif u.email == email:
                # 关联已有邮箱账户
                user = u
                user.google_id = google_id
                break
                
        if user is None:
            # 创建新用户
            user_id = str(uuid4())
            user = User(
                id=user_id,
                username=name or f"Google用户_{user_id[:6]}",
                email=email,
                password=hash_password(str(uuid4())),  # 随机密码
                avatar=picture,
                google_id=google_id  # 设置Google ID
            )
            users_db[user_id] = user
        
        # 创建令牌
        token = create_jwt_token(user.id)
        
        # 返回用户信息和令牌
        return {
            "token": token,
            "user": UserResponse(
                id=user.id,
                username=user.username,
                email=user.email,
                avatar=user.avatar,
                created_at=user.created_at,
                updated_at=user.updated_at,
            )
        }
        
    except requests.RequestException as e:
        print(f"Google OAuth请求异常: {str(e)}")
        raise ValueError(f"Google OAuth请求失败: {str(e)}")
    except ValueError as e:
        # 已经格式化的错误，直接传递
        raise
    except Exception as e:
        print(f"Google登录其他异常: {str(e)}")
        raise ValueError(f"Google登录处理失败: {str(e)}") 
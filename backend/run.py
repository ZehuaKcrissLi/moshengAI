import uvicorn
import os
from dotenv import load_dotenv

if __name__ == "__main__":
    # 加载环境变量
    load_dotenv()
    
    # 获取配置
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    
    # 启动服务
    uvicorn.run("app.main:app", host=host, port=port, reload=True) 
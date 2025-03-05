# 魔音AI - AI商业英文配音

魔音AI是一个基于人工智能的商业英文配音应用，提供高质量的英文语音合成服务，支持多种口音和语音风格。

## 核心功能

- 聊天式交互界面
- 多种英文口音选择（美式、英式等）
- 实时音频预览
- 智能文案生成
- 高质量配音合成
- 一键下载音频文件
- 背景音乐添加（规划中）

## 技术栈

### 前端
- React + TypeScript
- TailwindCSS 用于UI设计
- React Router 用于路由管理
- Axios 用于API请求
- Howler.js 用于音频处理

### 后端
- FastAPI (Python)
- OpenAI/DeepSeek/Grok API 集成
- JWT 认证

## 项目结构

```
/
├── frontend/          # React前端应用
│   ├── src/
│   │   ├── components/  # UI组件
│   │   ├── contexts/    # React上下文
│   │   ├── hooks/       # 自定义Hooks
│   │   ├── pages/       # 页面组件
│   │   └── services/    # API服务
│   └── public/          # 静态资源
└── backend/           # FastAPI后端服务
    ├── app/             # 应用代码
    │   ├── api/         # API路由
    │   ├── core/        # 核心功能
    │   ├── models/      # 数据模型
    │   └── services/    # 服务层
    ├── static/          # 静态文件
    └── tests/           # 测试文件
```

## 开发指南

### 前端

```bash
cd frontend
npm install
npm start
```

### 后端

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # 修改.env文件添加API密钥
uvicorn app.main:app --reload
```

## 部署

详细部署文档请查看 [部署指南](DEPLOYMENT.md) (待完成)

## 贡献指南

欢迎提交Pull Request或Issue！

## 许可证

MIT 
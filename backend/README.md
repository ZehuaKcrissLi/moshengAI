# 魔音AI - 后端服务

这是魔音AI（AI商业英文配音）应用的后端服务。

## 功能

- 提供API接口用于生成英文配音预览
- 支持多种口音和语音风格
- 基于用户描述生成配音文案
- 生成最终配音文件，支持下载

## 技术栈

- FastAPI: 高性能Web框架
- Uvicorn: ASGI服务器
- OpenAI API: 用于文本生成和语音合成
- 支持DeepSeek/GPT/Grok等多种API

## 开发环境设置

1. 安装依赖:

```bash
pip install -r requirements.txt
```

2. 创建.env文件:

```bash
cp .env.example .env
# 编辑.env文件，填入你的API密钥
```

3. 启动开发服务器:

```bash
uvicorn app.main:app --reload
```

4. 访问API文档:

```
http://localhost:8000/docs
```

## API文档

### 生成音频预览

```
POST /api/audio-previews

请求体:
{
  "text": "预览文本",
  "accent": "美式口音",
  "voice_style": "专业"
}
```

### 生成配音文案

```
POST /api/generate-script

请求体:
{
  "prompt": "用户描述需求的文本"
}
```

### 生成最终音频

```
POST /api/final-audio

请求体:
{
  "text": "配音文本",
  "accent": "美式口音",
  "voice_style": "专业"
}
``` 
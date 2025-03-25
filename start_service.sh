#!/bin/bash

# 设置环境变量
export PYTHONPATH=$PYTHONPATH:$(pwd)/moshengAI_tts/CosyVoice/third_party/Matcha-TTS

# 激活conda环境
echo "正在激活cosyvoice环境..."
source ~/miniforge3/bin/activate cosyvoice

# 检查ffmpeg-python是否安装
if ! pip list | grep -q "ffmpeg-python"; then
    echo "ffmpeg-python未安装，正在安装..."
    pip install ffmpeg-python
    if [ $? -ne 0 ]; then
        echo "安装ffmpeg-python失败，请手动安装后重试"
        exit 1
    fi
    echo "ffmpeg-python安装成功！"
else
    echo "ffmpeg-python已安装，继续启动服务..."
fi

# 检查系统ffmpeg命令是否可用
if ! command -v ffmpeg &> /dev/null; then
    echo "警告: 系统ffmpeg命令不可用，可能会影响音频转换功能"
    echo "请使用 'brew install ffmpeg' 或适合您系统的包管理器安装ffmpeg"
fi

# 启动API服务
echo "正在启动魔声AI语音合成API服务..."
python app.py 
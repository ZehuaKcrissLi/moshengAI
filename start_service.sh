#!/bin/bash

# 设置环境变量
export PYTHONPATH=$PYTHONPATH:$(pwd)/moshengAI_tts/CosyVoice/third_party/Matcha-TTS

# 激活conda环境
source ~/miniforge3/bin/activate cosyvoice

# 启动API服务
echo "正在启动魔声AI语音合成API服务..."
python app.py 
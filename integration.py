import os
import sys
import json
import requests
from pathlib import Path

"""
这个脚本演示了如何从魔声AI应用调用语音合成API。
在实际应用中，这些代码应该集成到魔声AI应用的后端。
"""

# API地址
API_URL = "http://localhost:8080/synthesize"

def synthesize_speech(text, voice_type="默认"):
    """
    调用API合成语音
    
    参数:
    - text: 要合成的文本
    - voice_type: 声音类型，默认为"默认"
    
    返回:
    - 语音文件的路径
    """
    try:
        print(f"正在合成文本: '{text}', 声音类型: {voice_type}")
        
        # 准备请求数据
        data = {
            "text": text,
            "voice_type": voice_type
        }
        
        # 发送请求
        response = requests.post(API_URL, data=data)
        
        if response.status_code != 200:
            print(f"合成失败: {response.status_code} - {response.text}")
            return None
        
        # 保存语音文件
        output_dir = Path("./client_output")
        output_dir.mkdir(exist_ok=True)
        
        output_path = output_dir / f"speech_{voice_type}.wav"
        
        with open(output_path, "wb") as f:
            f.write(response.content)
        
        print(f"已保存语音文件: {output_path}")
        return str(output_path)
    
    except Exception as e:
        print(f"合成过程中出错: {str(e)}")
        return None

def main():
    """
    主函数，演示如何使用API
    """
    # 测试文本
    test_text = "这是一个测试语音合成的文本"
    
    # 合成语音
    output_path = synthesize_speech(test_text)
    
    if output_path:
        print(f"语音合成成功，文件保存在: {output_path}")
        
        # 在实际应用中，这里可以将文件路径返回给前端
        result = {
            "success": True,
            "message": "语音合成成功",
            "file_path": output_path
        }
    else:
        print("语音合成失败")
        
        # 在实际应用中，这里可以返回错误信息给前端
        result = {
            "success": False,
            "message": "语音合成失败",
            "file_path": None
        }
    
    # 将结果转换为JSON格式
    result_json = json.dumps(result, ensure_ascii=False, indent=2)
    print(f"结果: {result_json}")

if __name__ == "__main__":
    main() 
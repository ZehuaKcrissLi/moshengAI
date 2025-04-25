import sys
import os
import torchaudio

# 添加Matcha-TTS到Python路径
sys.path.append('third_party/Matcha-TTS')

from cosyvoice.cli.cosyvoice import CosyVoice2
from cosyvoice.utils.file_utils import load_wav

def main():
    print("正在加载CosyVoice2模型...")
    # 加载模型
    cosyvoice = CosyVoice2('pretrained_models/CosyVoice2-0.5B', load_jit=False, load_trt=False, fp16=False)
    
    print("模型加载成功！")
    
    # 测试文本
    test_text = "好消息，好消息！魔声AI语音合成全面升级了！促销配音一次搞定，不信你就试试看！全友家居年货节，家具买一万送8999元，定制衣柜、整体橱柜，沙发，床垫，软床，成品家具，一站式购齐，地址:南屏首座二楼永辉超市楼上，全友家居。电话18859826481"
    
    print(f"正在合成文本: '{test_text}'")
    
    # 使用SFT模式合成语音
    for i, j in enumerate(cosyvoice.inference_sft(test_text, '中文女', stream=False)):
        output_path = f'test_output_{i}.wav'
        torchaudio.save(output_path, j['tts_speech'], cosyvoice.sample_rate)
        print(f"已保存语音文件: {output_path}")
    
    print("测试完成！")

if __name__ == "__main__":
    main() 
from fastapi import APIRouter, HTTPException, Body
import httpx
import os
from typing import List, Dict, Any, Optional
import json
import logging
import random
import re

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

DEEPSEEK_API_KEY = "sk-cd33591640b74e3cadbcb3407ac0c298"
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

# 魔声AI的系统提示
SYSTEM_PROMPT = """你是魔声AI，一个专业的AI配音助手。你专门帮助用户构思创作配音文案，并提供多种专业配音员音色，生成高质量的商业多语言配音。包括中文、英文、日语、韩语、法语、西语。

你的能力包括：
1. 根据用户直接给定的文稿，生成配音返回给用户
2. 根据和用户的对话，一步一步，让用户指导你，为用户创作配音文稿。
3. 提供多种语言文稿创作
4. 提供多种语音风格（高端大气、深沉、磁性、质感、亲切、知性、温暖、童声、浑厚、激情、促销）

在对话中，你应该：

- 如果用户直接发来一段文稿，你需要进行识别，对文稿进行sanity check，把错别字、typo等问题识别出来，把标点符号标准化，用你的语义理解，把逗号和句号改到合适的位置，以及去掉括号，去掉冒号等对于TTS不友好的标点符号。做好中文text normalization，比如把500元都换成五百元，把3.99元都换成三点九九元，并把文稿的格式进行整理，行程一个不带回车和空格，标准的纯文本，以方便api调用和让用户复制使用。例如用户可能发来一段以下这种带多个回车换行的格式不统一的文稿：
```
用户：
锅圈食汇泉山湖店
双十二活动开始啦

活动一：消费128元送锅（20cm电火锅，26cm煎烤盘，露营烧烤炉，32厘米不锈钢鸳鸯锅以上4选一）
注意：咱们一定要购入一张1.99的抢锅卷 
活动二：充值500元享受95折还能享受送锅
  
活动日期:12月2号至12月18号 活动不累计参加，不参与银行活动

你需要整理成以下格式：
```
锅圈食汇泉山湖店，双十二活动开始啦，活动一，消费一百二十八元送锅，二十厘米电火锅，二十六厘米煎烤盘，露营烧烤炉，三十二厘米不锈钢鸳鸯锅以上四选一。注意，咱们一定要购入一张一点九九的抢锅券。活动二，充值五百元享受九五折还能享受送锅。活动日期，十二月二号至十二月十八号，活动不累计参加，不参与银行活动。
```

- 返回整理好的文稿给用户，让用户确认是否用这段内容进行配音（这时候会返回一个确认的按钮，用户点击确认后，你再进行下一步（API调用））
- 用户如果点击确认，则进入到音色挑选的步骤，根据用户提供的配音文稿内容上下文，识别是属于哪种配音类型，然后根据配音类型，比如上述的例子就是门店促销叫卖，这种广告就适合音色库中名称标签带"促销"的音色。这里通过前后端的通信（API调用），返回给用户随机的6个音色（MUI风格的音频块，音频块下面有确认选择按钮）备选，三个男声，三个女声。告诉用户不满意还可以换一批听听（API调用）
- 用户试听音色后，如果满意，点击"使用"按钮，则根据整理好的文稿生成配音文案。（API调用）
- 如果用户没有直接给你文稿，而是说的其他内容，那首先和用户简单打招呼，然后询问用户是否有自己准备的配音文稿，如果没有，问用户需要什么语言的配音，是视频广告贴片，还是纪录片/专题片配音，还是门店促销，想要男声配音还是女声。
- 获得用户返回的信息后，通过提示用户，一步一步，让用户指导你，来创作文稿。你要视情况而定，根据用户提供的配音语言和配音类型，来决定如何一步一步的提问。
- 你需要根据用户的反馈对应地形成一个的问题组合，一次性问用户所有的问题，然后根据用户返回的信息，生成文稿。比如用户说是中文的视频广告贴片配音，你应该问1.广告影片的时长是多少，2.产品名称是什么，3.产品用户是谁，4.广告的风格调性是什么样的（高端大气？清新可爱？搞怪幽默？平直讲述？等等）
- 根据用户反馈，决定是否继续提问提示用户，还是完成了信息收集，生成对应的文稿。
- 回到音色挑选的步骤，如果用户说不满意（换一批之类的话），则重复音色挑选的步骤，如果用户满意，则根据整理好的文稿生成配音文案。（API调用）

你必须遵从的规则：
1. 你的生成内容中不要有'**'，'"'这些符号，你的生成内容应该保持plain text风格，这样好让用户复制粘贴成配音文案。
2. 如果是配音文案，你生成的内容中就必须只包含配音文案的纯文本，不要包含任何其他内容！
3. 请始终保持专业、友好和有帮助的态度，确保用户获得最佳的配音创作体验。"""

@router.post("/chat")
async def chat_with_deepseek(
    messages: List[Dict[str, str]] = Body(...),
    temperature: Optional[float] = Body(0.7),
    max_tokens: Optional[int] = Body(2000)
):
    """
    与DeepSeek API通信的聊天端点
    """
    try:
        # 打印接收到的消息以便调试
        logger.info(f"接收到的消息: {messages}")
        
        # 添加系统提示作为第一条消息（如果尚未存在）
        if not messages or messages[0].get("role") != "system":
            messages.insert(0, {"role": "system", "content": SYSTEM_PROMPT})
        
        payload = {
            "model": "deepseek-chat",
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False
        }
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
        }
        
        logger.info(f"发送请求到DeepSeek API")
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                DEEPSEEK_API_URL,
                json=payload,
                headers=headers
            )
            
            logger.info(f"DeepSeek API响应状态码: {response.status_code}")
            
            # 保存完整响应以便调试
            response_text = response.text
            logger.info(f"DeepSeek API原始响应: {response_text}")
            
            if response.status_code != 200:
                error_detail = response_text
                try:
                    error_json = response.json()
                    if "error" in error_json:
                        error_detail = error_json["error"].get("message", error_detail)
                except:
                    pass
                
                logger.error(f"DeepSeek API错误: {error_detail}")
                
                # 如果API密钥无效或额度不足，返回特定错误消息
                if "API key" in error_detail or "authentication" in error_detail.lower() or "insufficient" in error_detail.lower():
                    raise HTTPException(
                        status_code=402,
                        detail="DeepSeek API密钥无效或额度不足，请检查您的API密钥或充值账户。"
                    )
                
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"DeepSeek API错误: {error_detail}"
                )
            
            result = response.json()
            logger.info(f"处理后的结果: {result}")
            
            # 确保我们获得了正确的响应格式
            if "choices" not in result or not result["choices"]:
                logger.error("DeepSeek API响应格式错误: 缺少choices字段")
                raise HTTPException(
                    status_code=500,
                    detail="DeepSeek API响应格式错误"
                )
                
            # 返回实际的AI响应，而不是固定的欢迎语
            ai_message = result["choices"][0]["message"]["content"]
            
            return {
                "message": ai_message,
                "usage": result.get("usage", {})
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"处理聊天请求时发生错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"服务器错误: {str(e)}")

@router.post("/recommend_voice_styles")
async def recommend_voice_styles(
    text: str = Body(..., embed=True),
    count: int = Body(3, embed=True)
):
    """
    根据文本内容推荐合适的音色风格
    
    参数:
    - text: 用户的配音文本
    - count: 每种性别推荐的音色数量
    
    返回:
    - 推荐的男声和女声音色
    """
    try:
        logger.info(f"收到音色推荐请求，文本长度: {len(text)}")
        
        # 构建系统消息
        system_message = {
            "role": "system", 
            "content": """你是一个专业的配音顾问，你可以根据文本内容推荐合适的音色风格。
            你需要分析文本的语调、内容和使用场景，识别其所属的风格类别（如促销广告、企业宣传、温馨提示等），
            然后根据这些特点，从以下风格标签中选择最合适的几个：
            
            大气、磁性、质感、浑厚、激情、沉稳、温情、亲切、知性、温暖、稳重、英文
            
            你的回答必须是JSON格式，只包含一个字段"style_tags"，值为风格标签数组。
            例如: {"style_tags": ["大气", "磁性", "质感"]}
            """
        }
        
        # 构建用户消息
        user_message = {
            "role": "user",
            "content": f"请分析以下文本内容，并推荐最合适的3-5个风格标签：\n\n{text}"
        }
        
        # 发送请求到DeepSeek API
        payload = {
            "model": "deepseek-chat",
            "messages": [system_message, user_message],
            "temperature": 0.2,
            "max_tokens": 100,
            "stream": False
        }
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
        }
        
        logger.info(f"发送推荐请求到DeepSeek API")
        
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                DEEPSEEK_API_URL,
                json=payload,
                headers=headers
            )
            
            logger.info(f"DeepSeek API响应状态码: {response.status_code}")
            
            if response.status_code != 200:
                error_detail = response.text
                try:
                    error_json = response.json()
                    if "error" in error_json:
                        error_detail = error_json["error"].get("message", error_detail)
                except:
                    pass
                
                logger.error(f"DeepSeek API错误: {error_detail}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"DeepSeek API错误: {error_detail}"
                )
            
            result = response.json()
            logger.info(f"处理后的结果: {result}")
            
            # 提取响应中的风格标签
            ai_message = result["choices"][0]["message"]["content"]
            
            # 尝试解析JSON
            try:
                # 查找JSON格式内容
                json_match = re.search(r'\{.*\}', ai_message, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0)
                    style_data = json.loads(json_str)
                    style_tags = style_data.get("style_tags", [])
                else:
                    # 如果没有找到JSON，尝试直接从文本中提取标签
                    tags = re.findall(r'["\'](大气|磁性|质感|浑厚|激情|沉稳|温情|亲切|知性|温暖|稳重|英文)["\']', ai_message)
                    style_tags = list(set(tags))  # 去重
            except Exception as e:
                logger.error(f"解析风格标签失败: {str(e)}")
                # 使用一些默认标签
                style_tags = ["大气", "质感", "沉稳"]
            
            logger.info(f"提取的风格标签: {style_tags}")
            
            # 如果没有提取到标签，使用默认标签
            if not style_tags:
                style_tags = ["大气", "质感", "沉稳"]
            
            # 从项目根目录获取音色库路径
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            voice_dir = os.path.join(project_root, "prompt_voice")
            male_dir = os.path.join(voice_dir, "male")
            female_dir = os.path.join(voice_dir, "female")
            
            # 获取所有音色文件
            male_voices = [f for f in os.listdir(male_dir) if f.endswith(".wav")]
            female_voices = [f for f in os.listdir(female_dir) if f.endswith(".wav")]
            
            # 筛选符合风格标签的音色
            matched_male_voices = []
            matched_female_voices = []
            
            for voice in male_voices:
                if any(tag in voice for tag in style_tags):
                    matched_male_voices.append(os.path.splitext(voice)[0])
            
            for voice in female_voices:
                if any(tag in voice for tag in style_tags):
                    matched_female_voices.append(os.path.splitext(voice)[0])
            
            # 如果匹配结果太少，就从所有音色中随机选取
            if len(matched_male_voices) < count:
                all_male_voices = [os.path.splitext(f)[0] for f in male_voices]
                matched_male_voices.extend(random.sample([v for v in all_male_voices if v not in matched_male_voices], 
                                                    min(count - len(matched_male_voices), len(all_male_voices))))
            
            if len(matched_female_voices) < count:
                all_female_voices = [os.path.splitext(f)[0] for f in female_voices]
                matched_female_voices.extend(random.sample([v for v in all_female_voices if v not in matched_female_voices], 
                                                      min(count - len(matched_female_voices), len(all_female_voices))))
            
            # 确保不超过指定数量
            if len(matched_male_voices) > count:
                matched_male_voices = random.sample(matched_male_voices, count)
            
            if len(matched_female_voices) > count:
                matched_female_voices = random.sample(matched_female_voices, count)
            
            return {
                "success": True,
                "recommended_styles": style_tags,
                "male_voices": matched_male_voices,
                "female_voices": matched_female_voices
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"处理音色推荐请求时发生错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"服务器错误: {str(e)}")

# 添加一个简单的健康检查端点
@router.get("/health")
async def health_check():
    return {"status": "ok", "message": "聊天服务正常运行"} 
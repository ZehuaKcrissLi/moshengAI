from fastapi import APIRouter, HTTPException, Body
import httpx
import os
from typing import List, Dict, Any, Optional
import json
import logging
import random
import re
from collections import defaultdict

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

DEEPSEEK_API_KEY = "sk-cd33591640b74e3cadbcb3407ac0c298"
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

# 魔声AI的系统提示
SYSTEM_PROMPT = """你是魔声AI，一个专业的AI配音助手。你专门帮助用户构思创作配音文案，并提供多种专业配音员音色，生成高质量的商业多语言配音。包括中文、英文、日语、韩语、法语、西语。

你的能力包括：
1. 根据用户直接给定的文稿，整理格式并让用户确认。
2. 根据和用户的对话，一步一步指导用户创作配音文稿。
3. 根据用户确认的文稿，推荐合适的音色供用户选择。
4. 根据用户选择的音色和文稿，生成试听或最终配音。
5. 提供多种语言文稿创作和多种语音风格（高端大气、深沉、磁性、质感、亲切、知性、温暖、童声、浑厚、激情、促销）

【重要】函数调用规则：
当你需要执行特定操作时，必须使用特定格式 <<<JSON>>> 输出指令，且该部分不应包含其他任何文本。可用指令如下：

1.  推荐音色:
    <<<{
      "action": "recommend_voice_styles",
      "text": "[需要推荐音色的文稿内容]"
    }>>>
    使用场景：当用户确认了最终的配音文稿后，调用此指令来获取推荐音色。

2.  生成试听音频:
    <<<{
      "action": "tts_preview",
      "text": "[需要试听的文稿内容]",
      "gender": "[男声 或 女声]",
      "voice_label": "[用户选择的具体音色标签，例如：男声18激情质感风格]"
    }>>>
    使用场景：当用户在推荐的音色列表中点击了"试听"按钮时（前端会告知你用户点击了哪个音色），调用此指令生成该音色的试听音频。

3.  生成最终音频:
    <<<{
      "action": "tts_final",
      "text": "[最终确认的文稿内容]",
      "gender": "[男声 或 女声]",
      "voice_label": "[用户最终选择的具体音色标签]"
    }>>>
    使用场景：当用户试听后，点击了"使用此音色"按钮时（前端会告知你），调用此指令生成最终配音文件。

在对话中，你应该遵循以下流程：

- **文稿处理**: 如果用户直接发来一段文稿，你需要进行识别和整理（修正错别字、标准化标点、处理数字格式、做好中文text normalization，比如把500元都换成五百元，把3.99元都换成三点九九元等），例如: 一个不带回车和空格，标准的纯文本，以方便api调用和让用户复制使用。例如用户可能发来一段以下这种带多个回车换行的格式不统一的文稿：
```
用户：
锅圈食汇泉山湖店
双十二活动开始啦

活动一：消费128元送锅（20cm电火锅，26cm煎烤盘，露营烧烤炉，32厘米不锈钢鸳鸯锅以上4选一）
注意：咱们一定要购入一张1.99的抢锅卷 
活动二：充值500元享受95折还能享受送锅
  
活动日期:12月2号至12月18号 活动不累计参加，不参与银行活动，电话13756781720

你需要整理成以下格式：
```
锅圈食汇泉山湖店，双十二活动开始啦，活动一，消费一百二十八元送锅，二十厘米电火锅，二十六厘米煎烤盘，露营烧烤炉，三十二厘米不锈钢鸳鸯锅以上四选一。注意，咱们一定要购入一张一点九九的抢锅券。活动二，充值五百元享受九五折还能享受送锅。活动日期，十二月二号至十二月十八号，活动不累计参加，不参与银行活动。电话13756781720
```
然后返回整理好的文稿给用户，并询问："请确认是否使用这段内容进行配音？确认后我将为您推荐合适的促销风格音色。" （不要立即调用函数）
- **用户确认文稿后**: 如果用户确认（例如回复"是的"、"确认"），你 **必须** 调用 `recommend_voice_styles` 函数，例如：
  好的，正在为您推荐音色。
  <<<{
    "action": "recommend_voice_styles",
    "text": "[这里是用户确认的那段整理好的文稿]"
  }>>>
- **处理用户试听请求**: 当前端告知你用户点击了某个音色的"试听"按钮（例如："用户请求试听 男声18激情质感风格"），你 **必须** 调用 `tts_preview` 函数，例如：
  正在为您生成试听音频：男声18激情质感风格。
  <<<{
    "action": "tts_preview",
    "text": "[对应的文稿]",
    "gender": "男声",
    "voice_label": "男声18激情质感风格"
  }>>>
- **处理用户确认音色请求**: 当前端告知你用户点击了某个音色的"使用此音色"按钮（例如："用户确认使用 男声18激情质感风格"），你 **必须** 调用 `tts_final` 函数，例如：
  好的，正在为您生成最终配音。
  <<<{
    "action": "tts_final",
    "text": "[对应的文稿]",
    "gender": "男声",
    "voice_label": "男声18激情质感风格"
  }>>>
- **文稿创作**: 如果用户没有直接给你文稿，而是进行其他对话或提出创作需求，你需要与用户交互，引导用户提供信息（如语言、场景、风格、时长、产品等），逐步创作文稿。创作完成后，同样需要用户确认，然后才能进入推荐音色流程。

你必须遵从的规则：
1. 严格按照 <<<JSON>>> 格式输出函数调用指令，该标记内外不应有多余字符。
2. 在输出函数调用指令之前或之后，可以有自然的对话文本，但指令本身必须独立且格式正确。
3. 你的回答应保持 plain text 风格，便于前端处理。
4. 始终保持专业、友好和有帮助的态度。
"""

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
    根据文本内容推荐合适的音色风格, 优先确保各标签有代表.
    """
    try:
        logger.info(f"收到音色推荐请求，文本: '{text[:50]}...', count: {count}")

        # 构建系统消息
        system_message = {
            "role": "system", 
            "content": """你是一个专业的配音顾问，你可以根据文本内容推荐合适的音色风格。
            你需要分析文本的语调、内容和使用场景，识别其所属的风格类别（如促销广告、门店叫卖、企业宣传、温馨提示、专题纪录、颁奖词、亲切讲述、党政专题、童真模仿、知性解说等），
            然后根据这些特点，从以下风格标签中选择最合适的几个：
            
            大气|磁性|质感|浑厚|激情|沉稳|温情|亲切|知性|温暖|稳重|英文|促销|男童|女童|中年|中老年|专题|介绍|党政|故事|节目|颁奖|年会
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
                    tags = re.findall(r'["\'](大气|磁性|质感|浑厚|激情|沉稳|温情|亲切|知性|温暖|稳重|英文|促销|男童|女童|中年|中老年|专题|介绍|党政|故事|节目|颁奖|年会)["\']', ai_message)
                    style_tags = list(set(tags))  # 去重
            except Exception as e:
                logger.error(f"解析风格标签失败: {str(e)}")
                # 使用一些默认标签
                style_tags = ["大气", "质感", "沉稳"]
            
            logger.info(f"提取的风格标签: {style_tags}")
            
            if not style_tags:
                style_tags = ["大气", "质感", "沉稳"]
                logger.info(f"未提取到标签，使用默认: {style_tags}")

            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            voice_dir = os.path.join(project_root, "prompt_voice")
            male_dir = os.path.join(voice_dir, "male")
            female_dir = os.path.join(voice_dir, "female")

            all_male_voices_files = [f for f in os.listdir(male_dir) if f.endswith(".wav")]
            all_female_voices_files = [f for f in os.listdir(female_dir) if f.endswith(".wav")]
            all_male_voices = [os.path.splitext(f)[0] for f in all_male_voices_files]
            all_female_voices = [os.path.splitext(f)[0] for f in all_female_voices_files]

            def select_voices_for_gender(all_voices: List[str], target_tags: List[str], num_required: int) -> List[str]:
                """为指定性别选择音色的核心逻辑 - 修正版"""
                if not all_voices:
                    return []

                final_selection = set()
                voices_used = set() # 跟踪已被选中的音色

                # 1. 优先确保每个标签至少有一个代表
                random.shuffle(target_tags)
                for tag in target_tags:
                    if len(final_selection) >= num_required:
                        break

                    # 在 *所有* 音色中查找包含当前标签且 *尚未被使用* 的音色
                    tag_specific_matches = [
                        voice for voice in all_voices
                        if tag in voice and voice not in voices_used
                    ]

                    if tag_specific_matches:
                        chosen_voice = random.choice(tag_specific_matches)
                        final_selection.add(chosen_voice)
                        voices_used.add(chosen_voice)

                # 2. 如果名额未满，从所有 *至少匹配一个标签* 但 *尚未被使用* 的音色中随机补充
                needed_more = num_required - len(final_selection)
                if needed_more > 0:
                    # 找到所有匹配至少一个标签的音色
                    all_matching_voices = {
                        voice for voice in all_voices
                        if any(tag in voice for tag in target_tags)
                    }
                    # 排除已使用的
                    available_matching = list(all_matching_voices - voices_used)
                    if available_matching:
                        fillers = random.sample(available_matching, min(needed_more, len(available_matching)))
                        final_selection.update(fillers)
                        voices_used.update(fillers)

                # 3. 如果名额还未满，从所有 *剩余* 音色中（不匹配任何标签且未被使用）随机补充
                needed_even_more = num_required - len(final_selection)
                if needed_even_more > 0:
                    available_others = [v for v in all_voices if v not in voices_used]
                    if available_others:
                        fillers = random.sample(available_others, min(needed_even_more, len(available_others)))
                        final_selection.update(fillers)
                        # voices_used.update(fillers) # 这里不需要再更新，因为不会再用到

                # 4. 最终结果处理
                final_list = list(final_selection)
                # 如果因为某种原因选多了（理论上不太可能），裁剪
                if len(final_list) > num_required:
                    final_list = random.sample(final_list, num_required)

                random.shuffle(final_list) # 最后打乱顺序
                return final_list

            selected_male_voices = select_voices_for_gender(all_male_voices, style_tags, count)
            selected_female_voices = select_voices_for_gender(all_female_voices, style_tags, count)

            logger.info(f"最终推荐男声: {selected_male_voices}")
            logger.info(f"最终推荐女声: {selected_female_voices}")

            return {
                "success": True,
                "recommended_styles": style_tags,
                "male_voices": selected_male_voices,
                "female_voices": selected_female_voices
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
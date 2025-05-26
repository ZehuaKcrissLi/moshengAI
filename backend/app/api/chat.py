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
6. 根据用户指定的配音员编号（如男888、女468等），推荐该配音员的其他音色

【重要】函数调用规则：
当你需要执行特定操作时，必须使用特定格式 <<<JSON>>> 输出指令，且该部分不应包含其他任何文本。可用指令如下：

1.  推荐音色:
    <<<{
      "action": "recommend_voice_styles",
      "text": "[需要推荐音色的文稿内容，或当用户仅表达想先试听音色时，可以传入空字符串，记住如果用户指定就是要试听音色，那么你**必须**返回action并且text为空字符串，也就是实现直接让用户看到音色列表，不要说任何其他话]",
      "speaker_id": "[可选：当用户指定配音员时，填入配音员编号，如'男888'、'女468'等]"
    }>>>
    使用场景：
    - 当用户确认了最终的配音文稿后，或者当用户仅表达想先试听音色时，调用此指令来获取推荐音色。
    - 当用户指定要某个配音员的音色时（如"给我推荐男888的其他音色"、"我想要女468的音色"），也调用此指令，并在speaker_id字段中填入配音员编号。
    记住，你的任务就是返回action，不要说任何其他话，比如你自己捏造一些莫名其妙的不存在的音色。

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
- **用户指定配音员**: 如果用户提出要指定配音员的音色（如"给我推荐男888的其他音色"、"我想要女468的音色"），你 **必须** 调用 `recommend_voice_styles` 函数，例如：
  好的，正在为您推荐男888配音员的音色。
  <<<{
    "action": "recommend_voice_styles",
    "text": "",
    "speaker_id": "男888"
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
5. 当用户提到具体的配音员编号（如男888、女468等）时，要识别并使用speaker_id参数。
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
    count: int = Body(3, embed=True),
    speaker_id: Optional[str] = Body(None, embed=True)
):
    """
    根据文本内容推荐合适的音色风格, 优先确保各标签有代表.
    如果指定了speaker_id，则推荐该配音员的所有音色。
    """
    try:
        logger.info(f"收到音色推荐请求，文本: '{text[:50]}...', count: {count}, speaker_id: {speaker_id}")

        # 使用数据盘路径
        voice_dir = "/data/moshengAI/prompt_voice"
        male_dir = os.path.join(voice_dir, "male")
        female_dir = os.path.join(voice_dir, "female")

        all_male_voices_files = [f for f in os.listdir(male_dir) if f.endswith(".wav")]
        all_female_voices_files = [f for f in os.listdir(female_dir) if f.endswith(".wav")]
        all_male_voices = [os.path.splitext(f)[0] for f in all_male_voices_files]
        all_female_voices = [os.path.splitext(f)[0] for f in all_female_voices_files]

        # 如果指定了配音员ID，直接推荐该配音员的音色
        if speaker_id:
            logger.info(f"指定配音员推荐: {speaker_id}")
            
            # 提取配音员编号（如从"男888"中提取"888"）
            speaker_number = re.search(r'\d+', speaker_id)
            if speaker_number:
                speaker_num = speaker_number.group()
                
                # 根据性别确定搜索范围
                if speaker_id.startswith('男'):
                    target_voices = all_male_voices
                    gender_prefix = "男"
                elif speaker_id.startswith('女'):
                    target_voices = all_female_voices
                    gender_prefix = "女"
                else:
                    # 如果没有明确性别，搜索所有音色
                    target_voices = all_male_voices + all_female_voices
                    gender_prefix = ""
                
                # 查找该配音员的所有音色
                speaker_voices = [
                    voice for voice in target_voices 
                    if speaker_num in voice
                ]
                
                logger.info(f"找到配音员{speaker_id}的音色: {speaker_voices}")
                
                if speaker_voices:
                    # 随机打乱顺序并限制数量
                    random.shuffle(speaker_voices)
                    selected_voices = speaker_voices[:count]
                    
                    # 根据性别分组返回
                    if speaker_id.startswith('男'):
                        return {
                            "success": True,
                            "recommended_styles": [f"配音员{speaker_id}"],
                            "male_voices": selected_voices,
                            "female_voices": []
                        }
                    elif speaker_id.startswith('女'):
                        return {
                            "success": True,
                            "recommended_styles": [f"配音员{speaker_id}"],
                            "male_voices": [],
                            "female_voices": selected_voices
                        }
                    else:
                        # 混合性别的情况，需要分组
                        male_selected = [v for v in selected_voices if v in all_male_voices]
                        female_selected = [v for v in selected_voices if v in all_female_voices]
                        return {
                            "success": True,
                            "recommended_styles": [f"配音员{speaker_id}"],
                            "male_voices": male_selected,
                            "female_voices": female_selected
                        }
                else:
                    logger.warning(f"未找到配音员{speaker_id}的音色")
                    return {
                        "success": False,
                        "error": f"未找到配音员{speaker_id}的音色",
                        "male_voices": [],
                        "female_voices": []
                    }
            else:
                logger.warning(f"无法从{speaker_id}中提取配音员编号")
                return {
                    "success": False,
                    "error": f"无效的配音员ID格式: {speaker_id}",
                    "male_voices": [],
                    "female_voices": []
                }

        # 原有的基于文本内容的推荐逻辑
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

            def select_voices_for_gender(all_voices: List[str], target_tags: List[str], num_required: int) -> List[str]:
                """为指定性别选择音色的核心逻辑 - 优先推荐主要标签的所有音色"""
                if not all_voices:
                    return []

                final_selection = set()
                
                # 1. 按标签重要性排序（第一个标签通常是最重要的）
                # 对于每个标签，找到所有匹配的音色
                for i, tag in enumerate(target_tags):
                    tag_specific_matches = [
                        voice for voice in all_voices
                        if tag in voice and voice not in final_selection
                    ]
                    
                    if tag_specific_matches:
                        # 对于第一个（最重要的）标签，尽量推荐更多音色
                        if i == 0:  # 第一个标签是最重要的
                            # 如果是第一个标签，推荐所有匹配的音色（但不超过总需求数量）
                            max_for_first_tag = min(len(tag_specific_matches), max(num_required - 1, 1))
                            selected_for_tag = random.sample(tag_specific_matches, max_for_first_tag)
                            final_selection.update(selected_for_tag)
                            logger.info(f"主要标签 '{tag}' 推荐了 {len(selected_for_tag)} 个音色: {selected_for_tag}")
                        else:
                            # 对于其他标签，如果还有空位，最多推荐1-2个
                            remaining_slots = num_required - len(final_selection)
                            if remaining_slots > 0:
                                max_for_other_tag = min(len(tag_specific_matches), min(remaining_slots, 2))
                                selected_for_tag = random.sample(tag_specific_matches, max_for_other_tag)
                                final_selection.update(selected_for_tag)
                                logger.info(f"次要标签 '{tag}' 推荐了 {len(selected_for_tag)} 个音色: {selected_for_tag}")
                    
                    # 如果已经达到需求数量，停止
                    if len(final_selection) >= num_required:
                        break

                # 2. 如果名额未满，从所有匹配任意标签的音色中补充
                if len(final_selection) < num_required:
                    all_matching_voices = {
                        voice for voice in all_voices
                        if any(tag in voice for tag in target_tags) and voice not in final_selection
                    }
                    
                    remaining_slots = num_required - len(final_selection)
                    if all_matching_voices and remaining_slots > 0:
                        additional_voices = random.sample(
                            list(all_matching_voices), 
                            min(remaining_slots, len(all_matching_voices))
                        )
                        final_selection.update(additional_voices)
                        logger.info(f"补充推荐了 {len(additional_voices)} 个匹配音色: {additional_voices}")

                # 3. 如果还是不够，从所有剩余音色中随机补充
                if len(final_selection) < num_required:
                    remaining_voices = [v for v in all_voices if v not in final_selection]
                    remaining_slots = num_required - len(final_selection)
                    if remaining_voices and remaining_slots > 0:
                        fallback_voices = random.sample(
                            remaining_voices, 
                            min(remaining_slots, len(remaining_voices))
                        )
                        final_selection.update(fallback_voices)
                        logger.info(f"随机补充了 {len(fallback_voices)} 个音色: {fallback_voices}")

                final_list = list(final_selection)
                random.shuffle(final_list)  # 最后打乱顺序
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
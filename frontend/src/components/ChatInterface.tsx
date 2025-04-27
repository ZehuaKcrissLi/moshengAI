import React, { useState, useRef, useEffect } from 'react';
import AudioPlayer from './AudioPlayer';
// import { Message as MessageType, chatAPI, ttsAPI, ConfirmScriptResponse, TTSResponse } from '../services/api'; // Temporarily comment out unused types
import { Message as MessageType, chatAPI, ttsAPI } from '../services/api'; // Keep used ones
import LogoIcon from './LogoIcon';
import LoginModal from './LoginModal';
// import { VoiceSelector, Voice } from './VoiceSelector'; // Revert to default for now and comment out
import { VoiceSelector, Voice } from './VoiceSelector';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// import { useAuth } from '../contexts/AuthContext'; // Temporarily comment out
import { parseFunctionCalls, FunctionCall } from '../utils/functionCallParser'; // Keep used ones

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  audioPreviews?: AudioPreview[];
  generatedScript?: {
    english: string;
    chinese: string;
  };
  finalAudio?: string;
  error?: boolean; // 标记是否是错误消息
  formattedText?: string; // 存储格式化后的文本
  recommendedVoices?: { // 添加推荐音色
    male: VoicePreview[];
    female: VoicePreview[];
  };
}

interface AudioPreview {
  id: string;
  url: string;
  accent: string;
  voiceStyle: string;
}

// 语音预览数据结构
interface VoicePreview {
  id: string;
  label: string;
  gender: string;
  audioUrl?: string;
  isLoading?: boolean;
}

// Chat history type
interface ChatSession {
  id: string;
  title: string;
  date: string;
  preview: string;
  messages: Message[];
}

// 将前端Message格式转换为API Message格式
const convertToApiMessages = (messages: Message[]): MessageType[] => {
  return messages
    .filter(msg => msg.sender !== 'ai' || (!msg.content.includes('请选择您需要的口音') && !msg.error))
    .map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
};

// 生成唯一ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// 初始欢迎消息
const INITIAL_MESSAGES: Message[] = [
  {
    id: generateId(),
    content: '欢迎使用魔声AI配音助手！我可以帮您生成高质量的商业英文配音。请告诉我您的配音需求，例如主题、目标受众、风格等，或者直接提供您想要翻译和配音的中文内容。',
    sender: 'ai'
  }
];

// 预设用例
const PRESET_EXAMPLES = [
  { title: '企业宣传片配音', desc: '美式口音专业风格' },
  { title: '教育课程配音', desc: '英式口音清晰风格' },
  { title: '产品介绍视频', desc: '美式口音活力风格' }
];

const ChatInterface: React.FC = () => {
  // const { isAuthenticated } = useAuth(); // Temporarily comment out
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  const [apiError, setApiError] = useState<{ status: number; message: string } | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoicePreview | null>(null);
  const [isRecommendingVoices, setIsRecommendingVoices] = useState(false);
  
  // 监听清除会话事件
  useEffect(() => {
    const handleClearSession = () => {
      setMessages(INITIAL_MESSAGES);
      setInputValue('');
      setHasInteracted(false);
      setApiError(null);
      setSelectedAudio(null);
    };
    
    // 监听加载会话事件
    const handleLoadSession = (e: CustomEvent) => {
      if (e.detail && e.detail.messages) {
        setMessages(e.detail.messages);
        setHasInteracted(true);
      }
    };
    
    // 添加事件监听器
    window.addEventListener('clearChatSession', handleClearSession);
    window.addEventListener('loadChatSession', handleLoadSession as EventListener);
    
    // 清理事件监听器
    return () => {
      window.removeEventListener('clearChatSession', handleClearSession);
      window.removeEventListener('loadChatSession', handleLoadSession as EventListener);
    };
  }, []);
  
  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // 自动保存当前对话到最近历史
  useEffect(() => {
    if (messages.length > 1 && hasInteracted) {
      // 获取现有历史记录
      const chatHistory: ChatSession[] = JSON.parse(localStorage.getItem('chatHistory') || '[]'); // Add type
      
      // 生成更有意义的标题
      let title = '';
      
      if (messages.length > 1) {
        // 尝试基于用户第一条消息生成主题
        const firstUserMessage = messages.find(msg => msg.sender === 'user');
        if (firstUserMessage) {
          title = firstUserMessage.content.slice(0, 25) + (firstUserMessage.content.length > 25 ? '...' : '');
        } else {
          title = '新对话';
        }
      }
      
      // 创建对话ID，如果现有则保留ID
      const existingChat = chatHistory.find((chat: ChatSession) => // Use ChatSession type
        JSON.stringify(chat.messages) === JSON.stringify(messages)
      );
      
      const chatId = existingChat?.id || generateId();
      
      // 创建新的聊天记录对象
      const newChat: ChatSession = {
        id: chatId,
        title: title,
        date: new Date().toLocaleString(),
        preview: messages[messages.length - 1].content.slice(0, 50) + (messages[messages.length - 1].content.length > 50 ? '...' : ''),
        messages: messages
      };
      
      // 如果存在相同ID的对话，就更新它；否则添加新对话
      const chatIndex = chatHistory.findIndex((chat: ChatSession) => chat.id === chatId); // Use ChatSession type
      let updatedHistory;
      
      if (chatIndex !== -1) {
        // 更新现有对话
        updatedHistory = [...chatHistory];
        updatedHistory[chatIndex] = newChat;
      } else {
        // 添加新对话到历史记录前端
        updatedHistory = [newChat, ...chatHistory.filter((chat: ChatSession) => chat.id !== chatId)].slice(0, 50); // Use ChatSession type
      }
      
      // 保存更新后的历史记录
      localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
      
      // 触发历史记录更新事件，使Sidebar实时更新
      const event = new CustomEvent('chatHistoryUpdated', { detail: { chatHistory: updatedHistory } });
      window.dispatchEvent(event);
    }
  }, [messages, hasInteracted]);

  // 处理消息发送（集成函数调用解析）
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || isStreaming) return;
    
    // 检查是否已登录，如果未登录则显示登录弹窗 - 暂时禁用登录要求
    /*
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    */
    
    // 设置用户已交互
    if (!hasInteracted) {
      setHasInteracted(true);
    }
    
    const userMessage: Message = {
      id: generateId(),
      content: inputValue,
      sender: 'user'
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentMessages = [...messages, userMessage]; // 获取包含新用户消息的列表
    setInputValue('');
    setIsLoading(true);
    setApiError(null); 
    
    let newAiMessageId: string | null = null; // 用于追踪新 AI 消息的 ID

    try {
      const apiMessages = convertToApiMessages(currentMessages);
      console.log('发送到API的消息:', apiMessages);
      
      const response = await chatAPI.sendMessage(apiMessages);
      console.log('API响应:', response);
      
      const rawMessageContent = response.message;

      // 1. 解析函数调用
      const functionCalls = parseFunctionCalls(rawMessageContent);

      // 2. 准备要显示的文本 (移除函数调用标记)
      const displayText = rawMessageContent.replace(/<<<[\s\S]*?>>>/g, '').trim();

      // 3. 如果有纯文本内容，先流式显示，并获取新消息ID
      if (displayText) {
        // 修改 simulateStreamResponse 以返回新消息的 ID
        newAiMessageId = await simulateStreamResponse(displayText);
      } else {
        // 如果只有函数调用，确保loading状态结束
        setIsLoading(false);
      }

      // 4. 处理函数调用 (异步执行)
      if (functionCalls.length > 0) {
        // 优先使用流式响应生成的消息ID，否则使用用户消息ID作为后备（可能需要调整）
        const messageIdToUpdate = newAiMessageId || userMessage.id; 
        await handleFunctionCalls(functionCalls, messageIdToUpdate);
      }

    } catch (error: unknown) {
      console.error('发送消息错误:', error);
      const errorResponse = error as { response?: { status?: number, data?: { detail?: string } } };
      const errorStatus = errorResponse.response?.status || 500;
      const errorDetail = errorResponse.response?.data?.detail || '未知错误，请稍后再试';
      console.log(`API错误 (${errorStatus}):`, errorDetail);
      setApiError({ status: errorStatus, message: errorDetail });
      const errorMessage: Message = {
        id: generateId(),
        content: `抱歉，发生了错误 (${errorStatus}): ${errorDetail}`,
        sender: 'ai',
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false); // 确保错误时停止加载
    } 
    // finally 块被移到 simulateStreamResponse 和 handleFunctionCalls 内部管理 isLoading
  };

  // 修改 simulateStreamResponse 以返回新消息的 ID
  const simulateStreamResponse = async (response: string): Promise<string> => {
    setIsStreaming(true);
    setStreamingMessage('');
    const newId = generateId(); // 先生成 ID
    
    const chars = response.split('');
    for (let i = 0; i < chars.length; i++) {
      const delay = 10 + Math.random() * 30;
      await new Promise(resolve => setTimeout(resolve, delay));
      setStreamingMessage(prev => prev + chars[i]);
    }
    
    const aiMessage: Message = {
      id: newId, // 使用预生成的 ID
      content: response,
      sender: 'ai'
    };
    
    setMessages(prev => [...prev, aiMessage]);
    setIsStreaming(false);
    setStreamingMessage('');
    setIsLoading(false); // 流式结束后停止 loading
    return newId; // 返回新消息的 ID
  };

  // 使用预设示例
  const handleUseExample = (title: string) => {
    setInputValue(`请帮我生成一段关于"${title}"的配音文案`);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // 新增：处理函数调用的副作用
  const handleFunctionCalls = async (calls: FunctionCall[], messageIdToUpdate: string) => {
    setIsLoading(true); // 开始处理函数调用，显示加载状态
    try {
      for (const call of calls) {
        console.log('处理函数调用:', call.action, call.args);
        switch (call.action) {
          case 'recommend_voice_styles':
            // 确保 args.text 是字符串
            if (typeof call.args.text === 'string') {
                await handleRecommendVoiceStylesCall(call.args as { text: string }, messageIdToUpdate);
            } else {
                console.error('无效的 recommend_voice_styles 参数: text 不是字符串', call.args);
            }
            break;
          case 'tts_preview':
             // 参数类型断言，需要确保运行时类型匹配
            if (typeof call.args.text === 'string' && 
                typeof call.args.gender === 'string' && 
                typeof call.args.voice_label === 'string') {
                await handleTtsPreviewCall(call.args as { text: string; gender: string; voice_label: string }, messageIdToUpdate);
            } else {
                console.error('无效的 tts_preview 参数', call.args);
            }
            break;
          case 'tts_final':
             // 参数类型断言
            if (typeof call.args.text === 'string' && 
                typeof call.args.gender === 'string' && 
                typeof call.args.voice_label === 'string') {
                await handleTtsFinalCall(call.args as { text: string; gender: string; voice_label: string }, messageIdToUpdate);
            } else {
                 console.error('无效的 tts_final 参数', call.args);
            }
            break;
          default:
            console.warn('未知的函数调用:', call.action);
        }
      }
    } catch (error) {
      console.error("处理函数调用时出错:", error);
      const errorMsg: Message = {
        id: generateId(),
        content: `处理指令时出错: ${error instanceof Error ? error.message : '未知错误'}`,
        sender: 'ai',
        error: true,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false); // 所有函数调用处理完毕
    }
  };

  // 新增：处理 recommend_voice_styles 调用
  const handleRecommendVoiceStylesCall = async (args: { text: string }, messageId: string) => {
      // 复用之前的 handleConfirmText 逻辑
      await handleConfirmText(args.text, messageId);
  };

  // 新增：处理 tts_preview 调用 (复用 handlePreviewVoice)
  const handleTtsPreviewCall = async (args: { text: string; gender: string; voice_label: string }, messageId: string) => {
    // 需要找到包含推荐音色的那条消息，才能进行预览
    const targetMessage = messages.find(msg => msg.id === messageId);
    if (!targetMessage || !targetMessage.recommendedVoices) {
        console.error(`无法为消息 ${messageId} 执行 tts_preview，找不到推荐音色列表`);
        // 或者需要添加一条AI消息提示用户
        const errorMsg: Message = {
            id: generateId(),
            content: `抱歉，无法找到需要预览的音色信息。请先确认文本并选择音色。`, 
            sender: 'ai',
            error: true,
        };
        setMessages(prev => [...prev, errorMsg]);
        return; 
    }
    
    const voiceToPreview: VoicePreview = {
      id: `${args.gender}-${args.voice_label}`, // 构造一个临时的ID
      label: args.voice_label,
      gender: args.gender,
      isLoading: false, // 初始状态
    };
    // 复用之前的 handlePreviewVoice 逻辑
    await handlePreviewVoice(voiceToPreview, messageId);
  };

  // 新增：处理 tts_final 调用 (复用 handleConfirmVoice)
  const handleTtsFinalCall = async (args: { text: string; gender: string; voice_label: string }, messageId: string) => {
    // 需要找到包含推荐音色的那条消息
    const targetMessage = messages.find(msg => msg.id === messageId);
     if (!targetMessage || !targetMessage.recommendedVoices) {
        console.error(`无法为消息 ${messageId} 执行 tts_final，找不到推荐音色列表`);
        const errorMsg: Message = {
            id: generateId(),
            content: `抱歉，无法找到需要确认的音色信息。请先确认文本并选择音色。`, 
            sender: 'ai',
            error: true,
        };
        setMessages(prev => [...prev, errorMsg]);
        return; 
    }

    const voiceToConfirm: VoicePreview = {
      id: `${args.gender}-${args.voice_label}`,
      label: args.voice_label,
      gender: args.gender,
    };
    // 复用之前的 handleConfirmVoice 逻辑
    await handleConfirmVoice(voiceToConfirm, messageId);
  };

  // 提取DeepSeek可能提供的格式化文本
  const extractFormattedText = (message: string): string | null => {
    // 查找三个反引号之间的文本块
    const codeBlockMatch = message.match(/```\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      return codeBlockMatch[1].trim();
    }
    
    // 检查是否有引用样式的文本
    const quoteMatch = message.match(/>\s*([\s\S]*?)(\n\n|$)/);
    if (quoteMatch && quoteMatch[1]) {
      return quoteMatch[1].trim();
    }
    
    return null;
  };

  // 处理确认文本生成音频
  const handleConfirmText = async (text: string, messageId: string) => {
    setIsRecommendingVoices(true);
    
    try {
      // 调用API获取推荐音色
      const recommendResult = await chatAPI.recommendVoiceStyles(text);
      console.log('音色推荐结果:', recommendResult);
      
      if (recommendResult.success) {
        // 构建音色预览数据
        const maleVoices: VoicePreview[] = recommendResult.male_voices.map((voice: string) => ({
          id: `male-${voice}`,
          label: voice,
          gender: '男声',
          isLoading: false
        }));
        
        const femaleVoices: VoicePreview[] = recommendResult.female_voices.map((voice: string) => ({
          id: `female-${voice}`,
          label: voice,
          gender: '女声',
          isLoading: false
        }));
        
        // 更新消息对象，添加推荐音色
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { 
                  ...msg, 
                  formattedText: text,
                  recommendedVoices: {
                    male: maleVoices,
                    female: femaleVoices
                  }
                } 
              : msg
          )
        );
      } else {
        throw new Error('获取推荐音色失败');
      }
    } catch (error: unknown) {
      console.error('推荐音色错误:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      const aiMessage: Message = {
        id: generateId(),
        content: `抱歉，获取推荐音色时出错: ${errorMessage}`,
        sender: 'ai',
        error: true
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setIsRecommendingVoices(false);
    }
  };
  
  // 处理试听音色
  const handlePreviewVoice = async (voice: VoicePreview, messageId: string) => {
    // 设置当前选中的音色
    setSelectedVoice(voice);
    
    // 在messages中找到对应的消息和格式化文本
    const message = messages.find(msg => msg.id === messageId);
    if (!message || !message.formattedText) return;
    
    // 更新消息中音色的加载状态
    setMessages(prev => 
      prev.map(msg => {
        if (msg.id === messageId && msg.recommendedVoices) {
          const updatedMale = msg.recommendedVoices.male.map(v => 
            v.id === voice.id ? {...v, isLoading: true} : v
          );
          const updatedFemale = msg.recommendedVoices.female.map(v => 
            v.id === voice.id ? {...v, isLoading: true} : v
          );
          
          return {
            ...msg,
            recommendedVoices: {
              male: updatedMale,
              female: updatedFemale
            }
          };
        }
        return msg;
      })
    );
    
    try {
      // 确定性别和音色标签
      const gender = voice.gender;
      const voiceLabel = voice.label;
      
      // 调用TTS API合成语音
      const response = await ttsAPI.synthesize(message.formattedText, gender, voiceLabel);
      console.log('语音合成结果:', response);
      
      if (response.success) {
        // 更新音色的音频URL
        setMessages(prev => 
          prev.map(msg => {
            if (msg.id === messageId && msg.recommendedVoices) {
              const updatedMale = msg.recommendedVoices.male.map(v => 
                v.id === voice.id ? {...v, audioUrl: response.mp3_url, isLoading: false} : v
              );
              const updatedFemale = msg.recommendedVoices.female.map(v => 
                v.id === voice.id ? {...v, audioUrl: response.mp3_url, isLoading: false} : v
              );
              
              return {
                ...msg,
                recommendedVoices: {
                  male: updatedMale,
                  female: updatedFemale
                }
              };
            }
            return msg;
          })
        );
      } else {
        throw new Error('语音合成失败');
      }
    } catch (error: unknown) {
      console.error('语音合成错误:', error);
      
      // 恢复音色的加载状态
      setMessages(prev => 
        prev.map(msg => {
          if (msg.id === messageId && msg.recommendedVoices) {
            const updatedMale = msg.recommendedVoices.male.map(v => 
              v.id === voice.id ? {...v, isLoading: false} : v
            );
            const updatedFemale = msg.recommendedVoices.female.map(v => 
              v.id === voice.id ? {...v, isLoading: false} : v
            );
            
            return {
              ...msg,
              recommendedVoices: {
                male: updatedMale,
                female: updatedFemale
              }
            };
          }
          return msg;
        })
      );
      
      // 显示错误消息
      const errorMessage: Message = {
        id: generateId(),
        content: `试听语音时出错: ${error instanceof Error ? error.message : '未知错误'}`,
        sender: 'ai',
        error: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };
  
  // 处理确认使用音色
  const handleConfirmVoice = async (voice: VoicePreview, messageId: string) => {
    // 在messages中找到对应的消息和格式化文本
    const message = messages.find(msg => msg.id === messageId);
    if (!message || !message.formattedText) return;
    
    try {
      // 确定性别和音色标签
      const gender = voice.gender;
      const voiceLabel = voice.label;
      
      // 调用确认API生成最终音频
      const response = await ttsAPI.confirmScript(message.formattedText, gender, voiceLabel);
      console.log('确认生成结果:', response);
      
      if (response.success) {
        // 添加确认成功的消息
        const aiMessage: Message = {
          id: generateId(),
          content: `配音已生成完成，您可以点击下方播放按钮收听。`,
          sender: 'ai',
          finalAudio: response.mp3_url
        };
        
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error('确认生成失败');
      }
    } catch (error: unknown) {
      console.error('确认生成错误:', error);
      
      const errorMessage: Message = {
        id: generateId(),
        content: `确认生成时出错: ${error instanceof Error ? error.message : '未知错误'}`,
        sender: 'ai',
        error: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // 键盘事件处理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 处理音频预览选择
  const handlePreviewSelect = (previewId: string) => {
    setSelectedAudio(previewId);
  };

  // 下载音频
  const downloadAudio = (url: string) => {
    window.open(url, '_blank');
  };

  // 在渲染AI消息部分添加对音色推荐和预览的支持
  const renderAIMessage = (message: Message) => {
    // 在函数开始处添加类型守卫或检查，确保 message.recommendedVoices 存在且结构正确
    const hasMaleVoices = message.recommendedVoices?.male && Array.isArray(message.recommendedVoices.male);
    const hasFemaleVoices = message.recommendedVoices?.female && Array.isArray(message.recommendedVoices.female);
    
    return (
      <div className="text-left space-y-3 text-gray-800">
        <div className="whitespace-pre-wrap">{message.content.replace(/<<<[\s\S]*?>>>/g, '').trim()}</div>
        
        {/* 格式化文本确认按钮 */}
        {extractFormattedText(message.content) && !message.formattedText && (
          <div className="mt-4">
            <button
              onClick={() => handleConfirmText(extractFormattedText(message.content)!, message.id)}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isRecommendingVoices}
            >
              {isRecommendingVoices ? '正在分析文本内容...' : '确认使用此文本合成语音'}
            </button>
          </div>
        )}
        
        {/* 推荐音色区域 - 使用新的 VoiceSelector 组件 */}
        {message.recommendedVoices && (hasMaleVoices || hasFemaleVoices) && (
          <VoiceSelector
            // 提供默认空数组以防万一
            maleVoices={hasMaleVoices ? message.recommendedVoices!.male.map(v => ({ ...v, isLoading: v.isLoading ?? false })) : []}
            femaleVoices={hasFemaleVoices ? message.recommendedVoices!.female.map(v => ({ ...v, isLoading: v.isLoading ?? false })) : []}
            selectedVoiceId={selectedVoice?.id || null}
            onPreviewVoice={(voice: Voice) => {
              // 将 Voice 类型转换为 VoicePreview 类型
              const voicePreview: VoicePreview = { ...voice }; 
              handlePreviewVoice(voicePreview, message.id);
            }}
            onConfirmVoice={(voice: Voice) => {
              // 将 Voice 类型转换为 VoicePreview 类型
              const voicePreview: VoicePreview = { ...voice };
              handleConfirmVoice(voicePreview, message.id);
            }}
            onRefresh={() => {
              // 确保 message.formattedText 存在才重新推荐
              if (message.formattedText) {
                handleRecommendVoiceStylesCall({ text: message.formattedText }, message.id);
              }
            }}
            isLoading={isRecommendingVoices}
          />
        )}
        
        {/* 音频预览区域 */}
        {message.audioPreviews && message.audioPreviews.length > 0 && (
          <div className="mt-4 space-y-3">
            <h4 className="text-sm font-medium text-gray-700">音频预览:</h4>
            <div className="grid grid-cols-1 gap-3">
              {message.audioPreviews.map((preview) => (
                <div 
                  key={preview.id} 
                  className={`p-3 rounded-lg border ${selectedAudio === preview.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}
                  onClick={() => handlePreviewSelect(preview.id)}
                >
                  <AudioPlayer 
                    audioUrl={preview.url} 
                    accent={preview.accent} 
                    voiceStyle={preview.voiceStyle} 
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 生成的脚本 */}
        {message.generatedScript && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200 text-sm">
            <div className="mb-2">
              <span className="font-medium">英文脚本:</span>
              <p className="mt-1 text-gray-800">{message.generatedScript.english}</p>
            </div>
            <div>
              <span className="font-medium">中文原文:</span>
              <p className="mt-1 text-gray-600">{message.generatedScript.chinese}</p>
            </div>
          </div>
        )}
        
        {/* 最终音频 */}
        {message.finalAudio && (
          <div className="mt-4">
            <h4 className="text-base font-medium mb-2">最终配音</h4>
            <AudioPlayer 
              audioUrl={message.finalAudio} 
              onDownload={() => downloadAudio(message.finalAudio!)} 
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {!hasInteracted ? (
        // 初始欢迎界面 - 居中显示
        <div className="w-full h-full flex flex-col items-center justify-center">
          <div className="w-full max-w-4xl px-4">
            <div className="text-center mb-10">
              <LogoIcon className="h-20 w-20 mx-auto text-primary-600 mb-6" />
              <h1 className="text-3xl font-bold text-gray-800 mb-2">魔声AI配音助手</h1>
              <p className="text-lg text-gray-600 mx-auto">
                {messages[0].content}
              </p>
            </div>

            {/* 预设示例 */}
            <div className="mb-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PRESET_EXAMPLES.map((example, index) => (
                <div 
                  key={index}
                  onClick={() => handleUseExample(example.title)}
                  className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-primary-500 hover:shadow-md transition-all"
                >
                  <h3 className="font-medium text-gray-800">{example.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{example.desc}</p>
                </div>
              ))}
            </div>
            
            {/* 输入区域 */}
            <div className="w-full">
              <div className="flex items-center relative">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入您的配音需求或中文内容..."
                  className="chat-input pr-12"
                  rows={1}
                  autoFocus
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  className={`absolute right-2 p-2 rounded-full ${
                    !inputValue.trim() || isLoading
                      ? 'text-gray-400'
                      : 'text-primary-600 hover:bg-primary-50'
                  } transition-colors focus:outline-none`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
              
              {/* API状态指示 */}
              <div className="mt-2 text-xs text-center">
                <span className={`inline-flex items-center px-2 py-1 rounded-full ${
                  apiError ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                }`}>
                  <span className={`w-2 h-2 mr-1 rounded-full ${
                    apiError ? 'bg-red-500' : 'bg-green-500'
                  }`}></span>
                  {apiError ? 'API连接异常' : 'Deepseek-v3 已接入'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // 聊天界面 - 用户交互后显示
        <>
          {/* 消息区域 */}
          <div className="flex-1 w-full h-full overflow-y-auto scrollbar-thin bg-white">
            <div className="w-full max-w-3xl mx-auto py-4 px-4">
              {messages.map((message, index) => (
                index === 0 ? null : (
                  <div 
                    key={message.id}
                    className={`mb-6 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}
                  >
                    {message.sender === 'user' ? (
                      <div className="inline-block max-w-[90%] md:max-w-[75%]">
                        <div className="chat-bubble user">
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        </div>
                      </div>
                    ) : (
                      renderAIMessage(message)
                    )}
                  </div>
                )
              ))}
              
              {/* 流式生成内容 */}
              {isStreaming && (
                <div className="mb-6 text-left">
                  <div className="text-left space-y-3 text-gray-800">
                    <div className="whitespace-pre-wrap">{streamingMessage}</div>
                  </div>
                </div>
              )}
              
              {/* 加载指示器 */}
              {isLoading && !isStreaming && (
                <div className="mb-6 text-left">
                  <div className="text-left">
                    <div className="loading-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* API错误提示 */}
              {apiError && (
                <div className="text-center py-2 mb-4">
                  <div className="inline-block px-3 py-1 bg-red-50 text-red-600 text-xs rounded-md">
                    {apiError.message}
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          {/* 输入区域 */}
          <div className="w-full border-t border-gray-200 bg-white">
            <div className="w-full max-w-3xl mx-auto p-4">
              <div className="flex items-center relative">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入您的配音需求或中文内容..."
                  className="chat-input pr-12"
                  rows={1}
                  disabled={isStreaming}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading || isStreaming}
                  className={`absolute right-2 p-2 rounded-full ${
                    !inputValue.trim() || isLoading || isStreaming
                      ? 'text-gray-400'
                      : 'text-primary-600 hover:bg-primary-50'
                  } transition-colors focus:outline-none`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
              
              {/* API状态指示 */}
              <div className="mt-2 text-xs text-center">
                <span className={`inline-flex items-center px-2 py-1 rounded-full ${
                  apiError ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                }`}>
                  <span className={`w-2 h-2 mr-1 rounded-full ${
                    apiError ? 'bg-red-500' : 'bg-green-500'
                  }`}></span>
                  {apiError ? 'API连接异常' : 'Deepseek-v3 已接入'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* 登录弹窗 */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => {
          setShowLoginModal(false);
          // 可以在这里添加登录成功后的处理逻辑
        }}
      />
    </div>
  );
};

export default ChatInterface; 
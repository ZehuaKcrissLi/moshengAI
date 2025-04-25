import React, { useState, useRef, useEffect } from 'react';
import AudioPlayer from './AudioPlayer';
import { Message as MessageType, chatAPI, ttsAPI } from '../services/api';
import LogoIcon from './LogoIcon';
import LoginModal from './LoginModal';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useAuth } from '../contexts/AuthContext';

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
  const { isAuthenticated } = useAuth();
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
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
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
      const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
      
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
      const existingChat = chatHistory.find((chat: any) => 
        JSON.stringify(chat.messages) === JSON.stringify(messages)
      );
      
      const chatId = existingChat?.id || generateId();
      
      // 创建新的聊天记录对象
      const newChat = {
        id: chatId,
        title: title,
        date: new Date().toLocaleString(),
        preview: messages[messages.length - 1].content.slice(0, 50) + (messages[messages.length - 1].content.length > 50 ? '...' : ''),
        messages: messages
      };
      
      // 如果存在相同ID的对话，就更新它；否则添加新对话
      const chatIndex = chatHistory.findIndex((chat: any) => chat.id === chatId);
      let updatedHistory;
      
      if (chatIndex !== -1) {
        // 更新现有对话
        updatedHistory = [...chatHistory];
        updatedHistory[chatIndex] = newChat;
      } else {
        // 添加新对话到历史记录前端
        updatedHistory = [newChat, ...chatHistory.filter((chat: any) => chat.id !== chatId)].slice(0, 50); // 保留最近50条
      }
      
      // 保存更新后的历史记录
      localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
      
      // 触发历史记录更新事件，使Sidebar实时更新
      const event = new CustomEvent('chatHistoryUpdated', { detail: { chatHistory: updatedHistory } });
      window.dispatchEvent(event);
    }
  }, [messages, hasInteracted]);

  // 模拟流式生成
  const simulateStreamResponse = async (response: string) => {
    setIsStreaming(true);
    setStreamingMessage('');
    
    // 将响应分成字符并逐个显示
    const chars = response.split('');
    for (let i = 0; i < chars.length; i++) {
      // 随机的打字速度，使其看起来更自然
      const delay = 10 + Math.random() * 30;
      await new Promise(resolve => setTimeout(resolve, delay));
      setStreamingMessage(prev => prev + chars[i]);
    }
    
    // 流式生成结束后，将内容添加到消息列表
    const aiMessage: Message = {
      id: generateId(),
      content: response,
      sender: 'ai'
    };
    
    setMessages(prev => [...prev, aiMessage]);
    setIsStreaming(false);
    setStreamingMessage('');
  };
  
  // 使用预设示例
  const handleUseExample = (title: string) => {
    setInputValue(`请帮我生成一段${title}的英文配音`);
    if (inputRef.current) {
      inputRef.current.focus();
    }
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
    
    setIsGeneratingVoice(true);
    
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
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  // 处理消息发送（修改对提取格式化文本的处理）
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
    
    // 添加用户消息
    const userMessage: Message = {
      id: generateId(),
      content: inputValue,
      sender: 'user'
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setApiError(null); // 重置API错误状态
    
    try {
      // 准备API消息
      const apiMessages = convertToApiMessages([...messages, userMessage]);
      
      console.log('发送到API的消息:', apiMessages);
      
      // 发送消息到DeepSeek API
      const response = await chatAPI.sendMessage(apiMessages);
      
      console.log('API响应:', response);
      
      // 提取可能包含的格式化文本是在renderAIMessage中直接使用的
      // 不需要存储在组件状态中
      
      // 流式生成响应
      await simulateStreamResponse(response.message);
      
    } catch (error: unknown) {
      console.error('发送消息错误:', error);
      
      // 获取错误状态码和详细信息
      const errorResponse = error as { response?: { status?: number, data?: { detail?: string } } };
      const errorStatus = errorResponse.response?.status || 500;
      const errorDetail = errorResponse.response?.data?.detail || '未知错误，请稍后再试';
      
      console.log(`API错误 (${errorStatus}):`, errorDetail);
      
      // 设置API错误状态
      setApiError({
        status: errorStatus,
        message: errorDetail
      });
      
      // 添加错误消息
      const errorMessage: Message = {
        id: generateId(),
        content: `抱歉，发生了错误 (${errorStatus}): ${errorDetail}`,
        sender: 'ai',
        error: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
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
    return (
      <div className="text-left space-y-3 text-gray-800">
        <div className="whitespace-pre-wrap">{message.content}</div>
        
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
        
        {/* 推荐音色区域 */}
        {message.recommendedVoices && (
          <div className="mt-6">
            <h4 className="text-base font-medium mb-2">推荐音色</h4>
            
            {/* 男声区域 */}
            <div className="mb-4">
              <h5 className="text-sm font-medium mb-2 text-gray-700">男声</h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {message.recommendedVoices.male.map(voice => (
                  <div 
                    key={voice.id}
                    className={`p-3 rounded-lg border ${
                      selectedVoice?.id === voice.id 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 hover:border-primary-300'
                    } cursor-pointer transition-colors`}
                  >
                    <div className="font-medium text-gray-800 mb-2">{voice.label}</div>
                    
                    {/* 音频播放区域 */}
                    {voice.audioUrl ? (
                      <div className="mb-2">
                        <audio 
                          src={voice.audioUrl} 
                          controls 
                          className="w-full h-8"
                        />
                      </div>
                    ) : (
                      <div className="mb-2 py-2 text-center text-sm text-gray-500">
                        {voice.isLoading ? '加载中...' : '点击试听'}
                      </div>
                    )}
                    
                    {/* 按钮区域 */}
                    <div className="flex space-x-2 mt-2">
                      <button
                        onClick={() => handlePreviewVoice(voice, message.id)}
                        className="flex-1 px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200 focus:outline-none"
                        disabled={voice.isLoading}
                      >
                        {voice.isLoading ? '生成中...' : (voice.audioUrl ? '重新试听' : '试听')}
                      </button>
                      
                      {voice.audioUrl && (
                        <button
                          onClick={() => handleConfirmVoice(voice, message.id)}
                          className="flex-1 px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded hover:bg-primary-200 focus:outline-none"
                          disabled={isGeneratingVoice}
                        >
                          使用
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 女声区域 */}
            <div>
              <h5 className="text-sm font-medium mb-2 text-gray-700">女声</h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {message.recommendedVoices.female.map(voice => (
                  <div 
                    key={voice.id}
                    className={`p-3 rounded-lg border ${
                      selectedVoice?.id === voice.id 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 hover:border-primary-300'
                    } cursor-pointer transition-colors`}
                  >
                    <div className="font-medium text-gray-800 mb-2">{voice.label}</div>
                    
                    {/* 音频播放区域 */}
                    {voice.audioUrl ? (
                      <div className="mb-2">
                        <audio 
                          src={voice.audioUrl} 
                          controls 
                          className="w-full h-8"
                        />
                      </div>
                    ) : (
                      <div className="mb-2 py-2 text-center text-sm text-gray-500">
                        {voice.isLoading ? '加载中...' : '点击试听'}
                      </div>
                    )}
                    
                    {/* 按钮区域 */}
                    <div className="flex space-x-2 mt-2">
                      <button
                        onClick={() => handlePreviewVoice(voice, message.id)}
                        className="flex-1 px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200 focus:outline-none"
                        disabled={voice.isLoading}
                      >
                        {voice.isLoading ? '生成中...' : (voice.audioUrl ? '重新试听' : '试听')}
                      </button>
                      
                      {voice.audioUrl && (
                        <button
                          onClick={() => handleConfirmVoice(voice, message.id)}
                          className="flex-1 px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded hover:bg-primary-200 focus:outline-none"
                          disabled={isGeneratingVoice}
                        >
                          使用
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
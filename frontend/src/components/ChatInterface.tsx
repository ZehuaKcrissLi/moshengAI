import React, { useState, useRef, useEffect } from 'react';
import AudioPlayer from './AudioPlayer';
import { Message as MessageType, chatAPI } from '../services/api';
import LogoIcon from './LogoIcon';
import LoginModal from './LoginModal';
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
}

interface AudioPreview {
  id: string;
  url: string;
  accent: string;
  voiceStyle: string;
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

const ACCENT_OPTIONS = [
  { id: 'american', name: '美式口音', description: '地道流利的美式发音' },
  { id: 'british', name: '英式口音', description: '标准BBC英式发音' }
];

// 错误消息映射
const ERROR_MESSAGES: {[key: number]: string} = {
  402: "DeepSeek API密钥无效或额度不足，请检查API密钥或充值账户。",
  404: "API服务不可用，请检查后端服务是否正常运行。",
  429: "请求过于频繁，请稍后再试。",
  500: "服务器处理请求时出错，请稍后再试。",
  503: "服务暂时不可用，请稍后再试。"
};

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
  const useExample = (title: string) => {
    setInputValue(`请帮我生成一段${title}的英文配音`);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // 处理消息发送
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || isStreaming) return;
    
    // 检查是否已登录，如果未登录则显示登录弹窗
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    
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
      
      // 流式生成响应
      await simulateStreamResponse(response.message);
      
    } catch (error: any) {
      console.error('发送消息错误:', error);
      
      // 获取错误状态码和详细信息
      const errorStatus = error.response?.status || 500;
      const errorDetail = error.response?.data?.detail || '未知错误，请稍后再试';
      
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
                  onClick={() => useExample(example.title)}
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
                      <div className="text-left space-y-3 text-gray-800">
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        
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
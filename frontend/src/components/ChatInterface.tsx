import React, { useState, useRef, useEffect } from 'react';
import AudioPlayer from './AudioPlayer';
import { Message as MessageType, chatAPI } from '../services/api';

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
    content: '欢迎使用魔音AI配音助手！我可以帮您生成高质量的商业英文配音。请告诉我您的配音需求，例如主题、目标受众、风格等，或者直接提供您想要翻译和配音的中文内容。',
    sender: 'ai'
  }
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
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [apiConnected, setApiConnected] = useState(true);
  
  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 处理消息发送
  const handleSend = async () => {
    if (!inputValue.trim()) return;
    
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
      
      // 添加AI回复
      const aiMessage: Message = {
        id: generateId(),
        content: response.message,
        sender: 'ai'
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('发送消息错误:', error);
      
      // 获取错误状态码和详细信息
      const errorStatus = error.response?.status || 500;
      const errorDetail = error.response?.data?.detail || '未知错误，请稍后再试';
      
      console.log(`API错误 (${errorStatus}):`, errorDetail);
      
      // 设置API错误状态
      setApiError(`错误 ${errorStatus}: ${errorDetail}`);
      
      // 构建用户友好的错误消息
      const userFriendlyMessage = ERROR_MESSAGES[errorStatus] || '连接服务器时出错，请稍后再试';
      
      // 添加错误消息
      const errorMessage: Message = {
        id: generateId(),
        content: `抱歉，${userFriendlyMessage}\n\n技术详情: ${errorDetail}`,
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
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* 消息区域 */}
      <div className="flex-grow overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`message-bubble ${message.sender} ${message.error ? 'error' : ''} fade-in max-w-3xl`}
            >
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
          </div>
        ))}
        
        {/* 加载指示器 */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="message-bubble ai fade-in">
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
          <div className="text-center">
            <div className="inline-block px-3 py-1 bg-red-50 text-red-600 text-xs rounded-md">
              {apiError}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* 输入区域 */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-start">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入您的配音需求或中文内容..."
            className="chat-input"
            rows={3}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className={`ml-3 p-2 rounded-full ${
              !inputValue.trim() || isLoading
                ? 'bg-gray-200 text-gray-500'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            } transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
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
  );
};

export default ChatInterface; 
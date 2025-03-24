import React, { useState, useRef, useEffect } from 'react';
import AudioPlayer from './AudioPlayer';
import { Message as MessageType, chatAPI, ttsAPI } from '../services/api';
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
  ttsAudio?: {
    mp3Url: string;
    wavUrl: string;
    text: string;
  }; // TTS合成的音频
  confirmingText?: boolean; // 是否正在确认文本
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
    content: '欢迎使用魔声AI配音助手！我可以帮您生成高质量的中文配音。请输入您需要配音的文本，确认后我将为您生成语音。',
    sender: 'ai'
  }
];

// 预设用例
const PRESET_EXAMPLES = [
  { title: '企业宣传片配音', desc: '中文专业风格' },
  { title: '教育课程配音', desc: '中文清晰风格' },
  { title: '产品介绍视频', desc: '中文活力风格' }
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
  const { isAuthenticated, user } = useAuth();
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
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [scriptToConfirm, setScriptToConfirm] = useState<string | null>(null);
  
  // 监听清除会话事件
  useEffect(() => {
    const handleClearSession = () => {
      setMessages(INITIAL_MESSAGES);
      setInputValue('');
      setHasInteracted(false);
      setApiError(null);
      setSelectedAudio(null);
      setScriptToConfirm(null);
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
    setInputValue(`请帮我生成一段${title}的配音`);
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
      console.error('API请求错误:', error);
      
      // 处理API错误
      const status = error.response?.status || 500;
      const errorMessage = ERROR_MESSAGES[status] || error.message || '发生未知错误';
      
      // 添加错误消息
      const errorMsg: Message = {
        id: generateId(),
        content: `错误: ${errorMessage}`,
        sender: 'ai',
        error: true
      };
      
      setMessages(prev => [...prev, errorMsg]);
      setApiError({ status, message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };
  
  // 确认文本生成TTS
  const handleConfirmText = async (text: string) => {
    try {
      setIsSynthesizing(true);
      
      // 更新消息状态，标记为正在确认
      setMessages(prev => 
        prev.map(msg => 
          msg.content === text && msg.sender === 'ai' 
            ? { ...msg, confirmingText: true } 
            : msg
        )
      );
      
      // 调用TTS API合成语音
      const userId = user && typeof user === 'object' && 'id' in user ? user.id as string : undefined;
      const response = await ttsAPI.confirmScript(text, userId);
      
      // 更新消息，添加合成的音频
      setMessages(prev => 
        prev.map(msg => 
          msg.content === text && msg.sender === 'ai' 
            ? { 
                ...msg, 
                confirmingText: false,
                ttsAudio: {
                  mp3Url: response.mp3_url,
                  wavUrl: response.wav_url,
                  text: text
                } 
              } 
            : msg
        )
      );
      
      console.log('语音合成成功:', response);
      
      // 触发已保存语音更新事件
      const event = new CustomEvent('savedAudiosUpdated');
      window.dispatchEvent(event);
      
    } catch (error) {
      console.error('确认文本生成TTS失败:', error);
      
      // 更新消息状态，取消确认状态
      setMessages(prev => 
        prev.map(msg => 
          msg.content === text && msg.sender === 'ai' 
            ? { ...msg, confirmingText: false } 
            : msg
        )
      );
      
      // 显示错误消息
      const errorMsg: Message = {
        id: generateId(),
        content: `语音合成失败: ${error instanceof Error ? error.message : '未知错误'}`,
        sender: 'ai',
        error: true
      };
      
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 渲染消息
  const renderMessage = (message: Message) => {
    const isUserMessage = message.sender === 'user';
    
    // 聊天气泡样式
    const bubbleClass = isUserMessage 
      ? 'bg-primary-100 text-gray-800 border-primary-300 ml-auto' 
      : 'bg-white text-gray-800 border-gray-200';
      
    // 头像样式
    const avatarClass = isUserMessage
      ? 'bg-primary-600 order-2'
      : 'bg-slate-500 order-1';
    
    // 获取用户的首字母作为头像内容
    const getUserInitial = () => {
      if (user && typeof user === 'object') {
        if ('name' in user && typeof user.name === 'string' && user.name.length > 0) {
          return user.name[0].toUpperCase();
        } else if ('email' in user && typeof user.email === 'string' && user.email.length > 0) {
          return user.email[0].toUpperCase();
        }
      }
      return '用';
    };
    
    // 头像内容
    const avatarContent = isUserMessage
      ? getUserInitial()
      : 'AI';
    
    return (
      <div key={message.id} className={`flex items-start space-x-2 mb-4 ${isUserMessage ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex items-start space-x-2 ${isUserMessage ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm ${avatarClass}`}>
            {avatarContent}
          </div>
          
          <div className={`max-w-[80%] md:max-w-[70%] p-3 rounded-lg border ${bubbleClass} ${message.error ? 'bg-red-100 border-red-300 text-red-800' : ''}`}>
            {message.content.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < message.content.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
            
            {/* 语音确认按钮 - 仅对AI消息显示 */}
            {!isUserMessage && !message.error && !message.ttsAudio && !message.confirmingText && (
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => handleConfirmText(message.content)}
                  disabled={isSynthesizing}
                  className="text-xs px-2 py-1 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSynthesizing ? '合成中...' : '确认生成语音'}
                </button>
              </div>
            )}
            
            {/* 语音合成中状态 */}
            {message.confirmingText && (
              <div className="mt-2 text-xs text-gray-500 flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                正在生成语音...
              </div>
            )}
            
            {/* 音频播放器 */}
            {message.ttsAudio && (
              <div className="mt-3">
                <AudioPlayer 
                  audioUrl={message.ttsAudio.mp3Url} 
                  onDownload={() => {
                    // 创建一个下载链接
                    const link = document.createElement('a');
                    link.href = message.ttsAudio!.mp3Url;
                    link.download = `魔声AI语音_${new Date().toISOString().slice(0, 10)}.mp3`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex flex-col h-full">
      {/* 聊天头部 */}
      <div className="p-4 border-b bg-white z-10">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <LogoIcon className="w-6 h-6 mr-2" />
          魔声AI配音助手
        </h2>
      </div>
      
      {/* 聊天消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 bg-gray-50">
        {/* 预设示例卡片，仅在初始状态显示 */}
        {messages.length === 1 && !hasInteracted && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">尝试这些示例：</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {PRESET_EXAMPLES.map((example, index) => (
                <div 
                  key={index}
                  onClick={() => useExample(example.title)}
                  className="bg-white p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 cursor-pointer transition-all"
                >
                  <h4 className="font-medium text-gray-800">{example.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">{example.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 消息列表 */}
        {messages.map(renderMessage)}
        
        {/* 流式生成中的消息 */}
        {isStreaming && (
          <div className="flex items-start space-x-2 mb-4">
            <div className="flex items-start space-x-2">
              <div className="w-8 h-8 bg-slate-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                AI
              </div>
              <div className="max-w-[80%] md:max-w-[70%] p-3 rounded-lg border bg-white text-gray-800 border-gray-200">
                {streamingMessage.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i < streamingMessage.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
                <span className="inline-block ml-1 animate-pulse">▌</span>
              </div>
            </div>
          </div>
        )}
        
        {/* 底部参考元素，用于自动滚动 */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* 输入区域 */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t">
        {apiError && (
          <div className="mb-2 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-800">
            {apiError.message}
          </div>
        )}
        
        <form onSubmit={(e) => {e.preventDefault(); handleSend();}} className="flex items-end space-x-2">
          <textarea
            ref={inputRef}
            className="flex-1 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            placeholder="输入您想要转换成语音的文本..."
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={isLoading || isStreaming}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
            disabled={!inputValue.trim() || isLoading || isStreaming}
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              '发送'
            )}
          </button>
        </form>
      </div>
      
      {/* 登录模态框 */}
      {showLoginModal && (
        <LoginModal 
          isOpen={true}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => setShowLoginModal(false)}
        />
      )}
    </div>
  );
};

export default ChatInterface; 
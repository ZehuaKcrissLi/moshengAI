import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

interface ChatHistory {
  id: string;
  title: string;
  date: string;
  preview: string;
  messages?: any[];
}

interface AudioFile {
  id: string;
  title: string;
  date: string;
  duration: string;
  url: string;
}

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const [activeTab, setActiveTab] = useState<'recent' | 'saved'>('recent');
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  
  // 示例音频文件
  const savedAudioFiles: AudioFile[] = [
    {
      id: 'audio1',
      title: '英式新闻播报',
      date: '2023-09-15',
      duration: '0:42',
      url: 'https://example.com/audio1.mp3',
    },
    {
      id: 'audio2',
      title: '美式广告旁白',
      date: '2023-09-14',
      duration: '1:15',
      url: 'https://example.com/audio2.mp3',
    },
    {
      id: 'audio3',
      title: '播客开场白',
      date: '2023-09-10',
      duration: '0:36',
      url: 'https://example.com/audio3.mp3',
    },
  ];
  
  // 加载聊天历史
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('chatHistory');
      if (savedHistory) {
        setChatHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }, [location.pathname]); // 当路径变化时重新加载，确保历史记录实时更新
  
  // 开始新对话
  const handleNewChat = () => {
    // 关闭侧边栏（在移动视图中）
    setIsOpen(false);
    
    // 通知需要清除当前会话状态
    const clearEvent = new CustomEvent('clearChatSession');
    window.dispatchEvent(clearEvent);
    
    // 导航到首页，开始新对话
    navigate('/');
  };
  
  // 加载特定的聊天记录
  const loadChat = (chat: ChatHistory) => {
    // 关闭侧边栏（在移动视图中）
    setIsOpen(false);
    
    // 触发加载聊天事件
    const loadEvent = new CustomEvent('loadChatSession', { 
      detail: { messages: chat.messages } 
    });
    window.dispatchEvent(loadEvent);
  };
  
  // 下载音频
  const handleDownloadAudio = (e: React.MouseEvent, audioFile: AudioFile) => {
    e.stopPropagation();
    window.open(audioFile.url, '_blank');
  };

  return (
    <aside className={`sidebar bg-gray-50 border-r border-gray-200 ${isOpen ? 'open' : ''}`}>
      {/* 移动端关闭按钮 */}
      <div className="lg:hidden absolute top-4 right-3">
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded hover:bg-gray-200"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* 侧边栏内容 */}
      <div className="h-full flex flex-col p-3">
        {/* 新建按钮 */}
        <button
          onClick={handleNewChat}
          className="flex items-center justify-center w-full py-2.5 px-3 mb-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-1.5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建配音
        </button>
        
        {/* 分类标签 */}
        <div className="mb-4 border-b border-gray-200">
          <div className="flex">
            <button
              className={`flex-1 py-3 text-center font-medium text-sm ${
                activeTab === 'recent' 
                  ? 'text-primary-600 border-b-2 border-primary-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('recent')}
            >
              最近使用
            </button>
            <button
              className={`flex-1 py-3 text-center font-medium text-sm ${
                activeTab === 'saved' 
                  ? 'text-primary-600 border-b-2 border-primary-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('saved')}
            >
              已保存
            </button>
          </div>
        </div>
        
        {/* 内容列表 */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {activeTab === 'recent' ? (
            <>
              {chatHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>暂无历史记录</p>
                </div>
              ) : (
                <>
                  {chatHistory.map((chat) => (
                    <div 
                      key={chat.id}
                      onClick={() => loadChat(chat)}
                      className="p-3 mb-2 rounded-lg hover:bg-gray-100 cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-800 truncate">{chat.title}</h3>
                          <p className="text-xs text-gray-500 mt-1">{chat.date}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          ) : (
            <>
              {savedAudioFiles.map((audio) => (
                <div key={audio.id} className="p-3 mb-2 rounded-lg hover:bg-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-800">{audio.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">{audio.date} · {audio.duration}</p>
                    </div>
                    <button 
                      onClick={(e) => handleDownloadAudio(e, audio)}
                      className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-4 w-4" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar; 
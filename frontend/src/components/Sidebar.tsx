import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import UserAvatar from './UserAvatar';
import LoginModal from './LoginModal';

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

interface ChatGroup {
  title: string;
  chats: ChatHistory[];
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const [activeTab, setActiveTab] = useState<'recent' | 'saved'>('recent');
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState<string>('');
  const [groupedChats, setGroupedChats] = useState<ChatGroup[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
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
  
  // 添加登录模态框状态
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
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
    
    // 监听聊天历史更新事件
    const handleChatHistoryUpdated = (e: CustomEvent) => {
      if (e.detail && e.detail.chatHistory) {
        setChatHistory(e.detail.chatHistory);
      }
    };
    
    // 添加事件监听器
    window.addEventListener('chatHistoryUpdated', handleChatHistoryUpdated as EventListener);
    
    // 组件卸载时移除监听器
    return () => {
      window.removeEventListener('chatHistoryUpdated', handleChatHistoryUpdated as EventListener);
    };
  }, [location.pathname]); // 当路径变化时重新加载，确保历史记录实时更新
  
  // 按日期分组聊天记录
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const todayChats: ChatHistory[] = [];
    const recentChats: ChatHistory[] = [];
    const olderChats: ChatHistory[] = [];
    
    chatHistory.forEach(chat => {
      const chatDate = new Date(chat.date);
      
      if (chatDate >= today) {
        todayChats.push(chat);
      } else if (chatDate >= sevenDaysAgo) {
        recentChats.push(chat);
      } else if (chatDate >= thirtyDaysAgo) {
        olderChats.push(chat);
      }
    });
    
    const groups: ChatGroup[] = [];
    
    if (todayChats.length > 0) {
      groups.push({ title: '今天', chats: todayChats });
    }
    
    if (recentChats.length > 0) {
      groups.push({ title: '最近7天', chats: recentChats });
    }
    
    if (olderChats.length > 0) {
      groups.push({ title: '近30天', chats: olderChats });
    }
    
    setGroupedChats(groups);
  }, [chatHistory]);
  
  // 重命名时设置焦点
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [isRenaming]);
  
  // 开始新对话
  const handleNewChat = () => {
    // 只在移动视图下关闭侧边栏
    if (window.innerWidth < 1024) {  // lg断点通常是1024px
      setIsOpen(false);
    }
    
    // 通知需要清除当前会话状态
    const clearEvent = new CustomEvent('clearChatSession');
    window.dispatchEvent(clearEvent);
    
    // 导航到首页，开始新对话
    navigate('/');
  };
  
  // 加载特定的聊天记录
  const loadChat = (chat: ChatHistory) => {
    // 只在移动视图下关闭侧边栏
    if (window.innerWidth < 1024) {  // lg断点通常是1024px
      setIsOpen(false);
    }
    
    // 触发加载聊天事件
    const loadEvent = new CustomEvent('loadChatSession', { 
      detail: { messages: chat.messages } 
    });
    window.dispatchEvent(loadEvent);
  };
  
  // 切换菜单
  const toggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };
  
  // 删除聊天
  const deleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    // 更新本地存储
    const updatedHistory = chatHistory.filter(chat => chat.id !== id);
    localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
    setChatHistory(updatedHistory);
    setOpenMenuId(null);
  };
  
  // 开始重命名
  const startRename = (e: React.MouseEvent, chat: ChatHistory) => {
    e.stopPropagation();
    setIsRenaming(chat.id);
    setNewTitle(chat.title);
    setOpenMenuId(null);
  };
  
  // 提交重命名
  const submitRename = (id: string) => {
    if (!newTitle.trim()) return;
    
    // 更新本地存储
    const updatedHistory = chatHistory.map(chat => 
      chat.id === id ? { ...chat, title: newTitle.trim() } : chat
    );
    
    localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
    setChatHistory(updatedHistory);
    setIsRenaming(null);
  };
  
  // 处理重命名输入框按键事件
  const handleRenameKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitRename(id);
    } else if (e.key === 'Escape') {
      setIsRenaming(null);
    }
  };
  
  // 下载音频
  const handleDownloadAudio = (e: React.MouseEvent, audioFile: AudioFile) => {
    e.stopPropagation();
    window.open(audioFile.url, '_blank');
  };

  return (
    <aside className={`h-full flex flex-col ${isOpen ? 'w-full' : 'w-0'} transition-width duration-300 overflow-hidden`}>
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
          新建对话
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
        
        {/* 内容列表 - 固定高度并填充可用空间 */}
        <div className="flex-1 overflow-y-auto scrollbar-thin min-h-[calc(100vh-180px)]">
          {activeTab === 'recent' ? (
            <>
              {groupedChats.length === 0 ? (
                <div className="text-center py-8 text-gray-500 h-full flex items-center justify-center">
                  <p>暂无历史记录</p>
                </div>
              ) : (
                <>
                  {groupedChats.map((group, groupIndex) => (
                    <div key={groupIndex} className="mb-4">
                      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2">{group.title}</h3>
                      {group.chats.map((chat) => (
                        <div 
                          key={chat.id}
                          onClick={() => isRenaming !== chat.id && loadChat(chat)}
                          onMouseEnter={() => setHoveredChatId(chat.id)}
                          onMouseLeave={() => setHoveredChatId(null)}
                          className="p-3 mb-2 rounded-lg hover:bg-gray-100 cursor-pointer relative"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 overflow-hidden">
                              {isRenaming === chat.id ? (
                                <input
                                  ref={renameInputRef}
                                  type="text"
                                  value={newTitle}
                                  onChange={(e) => setNewTitle(e.target.value)}
                                  onKeyDown={(e) => handleRenameKeyDown(e, chat.id)}
                                  onBlur={() => submitRename(chat.id)}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-primary-500"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <h3 className="text-sm font-medium text-gray-800 truncate">{chat.title}</h3>
                              )}
                              <p className="text-xs text-gray-500 mt-1">{chat.date}</p>
                            </div>
                            
                            {isRenaming !== chat.id && hoveredChatId === chat.id && (
                              <div className="relative" ref={menuRef}>
                                <button 
                                  onClick={(e) => toggleMenu(e, chat.id)}
                                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full"
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
                                      d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" 
                                    />
                                  </svg>
                                </button>
                                
                                {openMenuId === chat.id && (
                                  <div className="absolute right-0 top-full mt-1 w-36 bg-white shadow-lg rounded-md border border-gray-200 z-10">
                                    <ul>
                                      <li>
                                        <button 
                                          onClick={(e) => startRename(e, chat)}
                                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                        >
                                          <svg 
                                            xmlns="http://www.w3.org/2000/svg" 
                                            className="h-4 w-4 mr-2" 
                                            fill="none" 
                                            viewBox="0 0 24 24" 
                                            stroke="currentColor"
                                          >
                                            <path 
                                              strokeLinecap="round" 
                                              strokeLinejoin="round" 
                                              strokeWidth={2} 
                                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
                                            />
                                          </svg>
                                          重命名
                                        </button>
                                      </li>
                                      <li>
                                        <button 
                                          onClick={(e) => deleteChat(e, chat.id)}
                                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                                        >
                                          <svg 
                                            xmlns="http://www.w3.org/2000/svg" 
                                            className="h-4 w-4 mr-2" 
                                            fill="none" 
                                            viewBox="0 0 24 24" 
                                            stroke="currentColor"
                                          >
                                            <path 
                                              strokeLinecap="round" 
                                              strokeLinejoin="round" 
                                              strokeWidth={2} 
                                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                                            />
                                          </svg>
                                          删除
                                        </button>
                                      </li>
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </>
          ) : (
            <div className="h-full">
              {savedAudioFiles.length === 0 ? (
                <div className="text-center py-8 text-gray-500 h-full flex items-center justify-center">
                  <p>暂无已保存的音频</p>
                </div>
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
          )}
        </div>
        
        {/* 添加底部用户信息 */}
        <div className="mt-auto border-t border-gray-200">
          <UserAvatar onClick={() => setShowLoginModal(true)} />
        </div>
      </div>
      
      {/* 登录弹窗 */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => setShowLoginModal(false)}
      />
    </aside>
  );
};

export default Sidebar; 
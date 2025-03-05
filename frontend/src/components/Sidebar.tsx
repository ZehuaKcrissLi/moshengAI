import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LogoIcon from './LogoIcon';

interface ChatHistory {
  id: string;
  title: string;
  date: string;
  preview: string;
}

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  
  // 模拟聊天历史
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([
    {
      id: '1',
      title: '企业宣传片配音',
      date: '2小时前',
      preview: '美式口音专业风格',
    },
    {
      id: '2',
      title: '教育课程配音',
      date: '昨天',
      preview: '英式口音自然风格',
    },
    {
      id: '3',
      title: '产品介绍视频',
      date: '3天前',
      preview: '美式口音活力风格',
    },
  ]);

  const [activeSection, setActiveSection] = useState('recent');

  const startNewChat = () => {
    // 新建对话的逻辑
    navigate('/');
  };

  return (
    <div 
      className={`bg-white border-r border-gray-200 h-screen flex flex-col transition-all duration-300 ease-in-out ${
        isOpen ? 'w-72' : 'w-0 overflow-hidden'
      }`}
    >
      {/* 侧边栏头部 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <LogoIcon className="h-8 w-8 text-primary-600" />
          <h1 className="text-xl font-semibold text-gray-800">魔音AI</h1>
        </div>
        <button 
          onClick={startNewChat}
          className="mt-4 w-full flex items-center justify-center space-x-2 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          <span>新建配音</span>
        </button>
      </div>
      
      {/* 导航区域 */}
      <div className="px-3 py-2 border-b border-gray-200">
        <div className="flex space-x-1">
          <button 
            className={`flex-1 py-1.5 text-sm rounded-md ${activeSection === 'recent' ? 'bg-gray-100 text-gray-800' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setActiveSection('recent')}
          >
            最近
          </button>
          <button 
            className={`flex-1 py-1.5 text-sm rounded-md ${activeSection === 'saved' ? 'bg-gray-100 text-gray-800' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setActiveSection('saved')}
          >
            已保存
          </button>
        </div>
      </div>
      
      {/* 对话历史列表 */}
      <div className="flex-1 overflow-y-auto">
        <div className="py-2">
          <div className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wider">
            {activeSection === 'recent' ? '最近对话' : '已保存对话'}
          </div>
          <ul className="mt-1">
            {chatHistory.map((chat) => (
              <li key={chat.id}>
                <Link
                  to={`/chat/${chat.id}`}
                  className="block px-4 py-2 hover:bg-gray-50 rounded-md mx-2"
                >
                  <div className="font-medium text-gray-800 truncate">{chat.title}</div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500">{chat.date}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {chat.preview}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* 底部区域 */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-800">用户</div>
            <div className="text-xs text-gray-500">免费用户</div>
          </div>
          <button className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 
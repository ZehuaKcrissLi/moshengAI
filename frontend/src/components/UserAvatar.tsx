import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface UserAvatarProps {
  onClick?: () => void;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ onClick }) => {
  const { user, isAuthenticated, logout } = useAuth();
  
  // 如果未登录，显示登录按钮
  if (!isAuthenticated || !user) {
    return (
      <button 
        onClick={onClick} 
        className="flex items-center p-3 w-full hover:bg-gray-100 rounded-lg text-left"
      >
        <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-gray-700">登录/注册</p>
          <p className="text-xs text-gray-500">登录后享受更多功能</p>
        </div>
      </button>
    );
  }
  
  // 如果已登录，显示用户信息和退出选项
  return (
    <div className="relative group">
      <button 
        className="flex items-center p-3 w-full hover:bg-gray-100 rounded-lg text-left"
      >
        <div className="relative">
          {user.avatar ? (
            <img 
              src={user.avatar} 
              alt={user.username}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
              {user.username.substring(0, 1).toUpperCase()}
            </div>
          )}
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white"></span>
        </div>
        <div className="ml-3 flex-1 overflow-hidden">
          <p className="text-sm font-medium text-gray-700 truncate">{user.username}</p>
          <p className="text-xs text-gray-500 truncate">{user.email}</p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* 下拉菜单 */}
      <div className="absolute right-0 left-0 mt-1 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-300 transform origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
        <div className="py-1">
          <a href="#profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            个人信息
          </a>
          <a href="#settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            设置
          </a>
          <button
            onClick={logout}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
          >
            退出登录
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserAvatar; 
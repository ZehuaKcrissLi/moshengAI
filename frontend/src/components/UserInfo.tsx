import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const UserInfo: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  
  if (!isAuthenticated || !user) {
    return null;
  }
  
  return (
    <div className="flex items-center space-x-2 p-2 bg-white rounded-lg shadow-sm">
      {user.avatar ? (
        <img 
          src={user.avatar} 
          alt={user.username} 
          className="w-8 h-8 rounded-full"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
          {user.username.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="text-sm">
        <div className="font-medium text-gray-700">{user.username}</div>
        <div className="text-xs text-gray-500">{user.email}</div>
      </div>
      <button 
        onClick={logout}
        className="ml-2 text-xs text-red-600 hover:text-red-800"
      >
        退出
      </button>
    </div>
  );
};

export default UserInfo; 
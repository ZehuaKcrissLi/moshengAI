import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, User, LoginResponse } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  wechatLogin: (code: string) => Promise<void>;
  googleLogin: (code: string) => Promise<LoginResponse>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth必须在AuthProvider内部使用');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // 创建一个默认用户，使系统认为用户已登录
  const defaultUser: User = {
    id: '1',
    username: '游客用户',
    email: 'guest@example.com'
  };

  const [user, setUser] = useState<User | null>(defaultUser);
  const [isLoading, setIsLoading] = useState<boolean>(false); // 直接设置为false，无需加载
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true); // 直接设置为已认证状态
  
  // 检查用户是否已经登录 - 暂时跳过认证检查
  useEffect(() => {
    // 不执行实际的认证检查，保持默认已登录状态
  }, []);
  
  // 登录 - 简化实现
  const login = async (email: string, password: string) => {
    // 直接返回成功，无需实际调用API
    console.log('登录功能已暂时禁用，系统使用游客模式');
    return;
  };
  
  // 注册 - 简化实现
  const register = async (username: string, email: string, password: string) => {
    // 直接返回成功，无需实际调用API
    console.log('注册功能已暂时禁用，系统使用游客模式');
    return;
  };
  
  // 退出登录 - 保持登录状态
  const logout = () => {
    console.log('登出功能已暂时禁用，系统保持游客模式');
    // 不改变认证状态
  };
  
  // 微信登录 - 简化实现
  const wechatLogin = async (code: string) => {
    console.log('微信登录功能已暂时禁用，系统使用游客模式');
    return;
  };
  
  // Google登录 - 简化实现
  const googleLogin = async (code: string) => {
    console.log('Google登录功能已暂时禁用，系统使用游客模式');
    // 返回一个假的登录响应
    const mockResponse: LoginResponse = {
      token: 'fake-token',
      user: defaultUser
    };
    return mockResponse;
  };
  
  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    wechatLogin,
    googleLogin,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider; 
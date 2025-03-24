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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  // 检查用户是否已经登录
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 尝试从localStorage获取用户信息，避免直接API调用
        const savedToken = localStorage.getItem('authToken');
        const savedUser = localStorage.getItem('user');
        
        if (savedToken && savedUser) {
          try {
            const userObj = JSON.parse(savedUser);
            setUser(userObj);
            setIsAuthenticated(true);
          } catch (e) {
            // JSON解析错误，清除存储的数据
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
          }
        } else {
          // 如果没有本地存储的用户信息，尝试从API获取
          try {
            const currentUser = await authAPI.getCurrentUser();
            setUser(currentUser);
            setIsAuthenticated(!!currentUser);
          } catch (error) {
            console.log('用户未登录或API不可用:', error);
            // 忽略错误，保持未认证状态
          }
        }
      } catch (e) {
        console.error('检查认证状态时出错:', e);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // 登录
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // 暂时使用简化实现，实际项目中应调用真实API
      console.log('登录功能暂未实现', email);
      // 模拟登录成功
      const mockUser = { id: '1', email, username: email.split('@')[0] };
      setUser(mockUser as User);
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 注册
  const register = async (username: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      // 暂时使用简化实现，实际项目中应调用真实API
      console.log('注册功能暂未实现', username, email);
      // 模拟注册成功
      const mockUser = { id: '1', email, username };
      setUser(mockUser as User);
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 退出登录
  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };
  
  // 微信登录
  const wechatLogin = async (code: string) => {
    setIsLoading(true);
    try {
      // 暂时使用简化实现，实际项目中应调用真实API
      console.log('微信登录功能暂未实现', code);
      // 模拟登录成功
      const mockUser = { id: '1', username: '微信用户', email: 'wechat@example.com' };
      setUser(mockUser as User);
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Google登录
  const googleLogin = async (code: string) => {
    setIsLoading(true);
    try {
      const response = await authAPI.googleLogin(code);
      if (response.token) {
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } catch (error) {
      console.error('Google登录失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
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
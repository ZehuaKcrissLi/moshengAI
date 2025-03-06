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
    const checkAuth = () => {
      const currentUser = authAPI.getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);
  
  // 登录
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authAPI.login(email, password);
      setUser(response.user);
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 注册
  const register = async (username: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authAPI.register(username, email, password);
      setUser(response.user);
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 退出登录
  const logout = () => {
    authAPI.logout();
    setUser(null);
    setIsAuthenticated(false);
  };
  
  // 微信登录
  const wechatLogin = async (code: string) => {
    setIsLoading(true);
    try {
      const response = await authAPI.wechatLogin(code);
      setUser(response.user);
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
import React, { useState } from 'react';
import { authAPI } from '../services/api';
import LogoIcon from './LogoIcon';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 显示注册表单
  const [showRegister, setShowRegister] = useState(false);
  const [username, setUsername] = useState('');

  // 处理登录提交
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('请填写所有必填字段');
      return;
    }
    
    if (!acceptTerms) {
      setError('请同意使用条款和隐私政策');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await authAPI.login(email, password);
      console.log('登录成功:', response);
      onLoginSuccess();
      onClose();
    } catch (err: any) {
      console.error('登录失败:', err);
      setError(err.response?.data?.message || '登录失败，请检查邮箱和密码');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 处理注册提交
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !email || !password) {
      setError('请填写所有必填字段');
      return;
    }
    
    if (!acceptTerms) {
      setError('请同意使用条款和隐私政策');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await authAPI.register(username, email, password);
      console.log('注册成功:', response);
      onLoginSuccess();
      onClose();
    } catch (err: any) {
      console.error('注册失败:', err);
      setError(err.response?.data?.message || '注册失败，请尝试其他邮箱或用户名');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 处理微信登录
  const handleWechatLogin = () => {
    // 微信OAuth参数
    const appId = 'YOUR_WECHAT_APP_ID'; // 替换为实际的微信AppID
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/wechat-callback`);
    const scope = 'snsapi_login';
    const state = Math.random().toString(36).substring(2);
    
    // 保存state用于防止CSRF攻击
    localStorage.setItem('wechat_auth_state', state);
    
    // 构建微信OAuth URL
    const wechatOAuthUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}#wechat_redirect`;
    
    // 打开微信登录窗口
    const wechatLoginWindow = window.open(wechatOAuthUrl, '_blank', 'width=600,height=600');
    
    // 监听消息事件
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'wechat-login-success') {
        // 登录成功
        onLoginSuccess();
        onClose();
        window.removeEventListener('message', handleMessage);
      } else if (event.data.type === 'wechat-login-error') {
        // 登录失败
        setError('微信登录失败，请重试');
        window.removeEventListener('message', handleMessage);
      }
    };
    
    window.addEventListener('message', handleMessage);
  };
  
  // 处理Google登录
  const handleGoogleLogin = () => {
    // Google OAuth参数 - 确保与后端保持一致
    const clientId = '1080640002203-8llt2h00f9dbj5e7gd6t0rakh61b8ch1.apps.googleusercontent.com';
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/google-callback`);
    const scope = encodeURIComponent('profile email');
    const responseType = 'code';
    const state = Math.random().toString(36).substring(2);
    const accessType = 'offline';
    const prompt = 'consent';
    
    // 保存state用于防止CSRF攻击
    localStorage.setItem('google_auth_state', state);
    
    // 构建Google OAuth URL
    const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}&state=${state}&access_type=${accessType}&prompt=${prompt}`;
    
    console.log('打开Google登录链接:', googleOAuthUrl);
    
    // 打开Google登录窗口
    const googleLoginWindow = window.open(googleOAuthUrl, 'Google登录', 'width=600,height=700');
    if (!googleLoginWindow) {
      setError('无法打开登录窗口，请检查是否阻止了弹出窗口');
      return;
    }
    
    // 监听消息事件
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'google-login-success') {
        // 登录成功
        onLoginSuccess();
        onClose();
        window.removeEventListener('message', handleMessage);
      } else if (event.data.type === 'google-login-error') {
        // 登录失败
        if (event.data.error === 'auth_code_used') {
          setError('需要重新授权，请再次点击Google登录');
          // 清除可能存在的旧状态
          localStorage.removeItem('google_auth_state');
        } else {
          setError(`Google登录失败: ${event.data.message || event.data.error || '请重试'}`);
        }
        window.removeEventListener('message', handleMessage);
      }
    };
    
    window.addEventListener('message', handleMessage);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* 关闭按钮 */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* 标题 */}
        <div className="flex flex-col items-center justify-center px-6 py-8">
          <LogoIcon className="h-10 w-10 text-primary-600" />
          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {showRegister ? '注册账号' : '欢迎使用魔声AI'}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {showRegister ? '创建您的账号，开始使用魔声AI' : '登录您的账号，享受更多功能'}
          </p>
        </div>
        
        {/* 表单内容 */}
        <div className="px-6 pb-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded">
              {error}
            </div>
          )}
          
          <form onSubmit={showRegister ? handleRegister : handleLogin}>
            {/* 注册时显示用户名字段 */}
            {showRegister && (
              <div className="mb-4">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  用户名
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="请输入用户名"
                />
              </div>
            )}
            
            {/* 邮箱 */}
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                手机号/邮箱
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="请输入手机号或邮箱"
              />
            </div>
            
            {/* 密码 */}
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="请输入密码"
              />
            </div>
            
            {/* 同意条款 */}
            <div className="mb-6">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                />
                <span className="ml-2 text-sm text-gray-600">
                  我已阅读并同意{' '}
                  <a href="#" className="text-primary-600 hover:underline">使用条款</a>
                  {' '}和{' '}
                  <a href="#" className="text-primary-600 hover:underline">隐私政策</a>
                </span>
              </label>
            </div>
            
            {/* 登录/注册按钮 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  处理中...
                </span>
              ) : (
                showRegister ? '注册' : '登录'
              )}
            </button>
            
            {/* 注册/登录切换与忘记密码 */}
            <div className="mt-4 flex justify-between text-sm">
              <button
                type="button"
                onClick={() => setShowRegister(!showRegister)}
                className="text-primary-600 hover:underline"
              >
                {showRegister ? '已有账号? 登录' : '没有账号? 注册'}
              </button>
              
              {!showRegister && (
                <a href="#" className="text-primary-600 hover:underline">
                  忘记密码?
                </a>
              )}
            </div>
          </form>
          
          {/* 社交登录分割线 */}
          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                或通过社交账号登录
              </span>
            </div>
          </div>
          
          {/* 社交登录按钮 */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleWechatLogin}
              className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <span className="flex items-center justify-center">
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="#07C160">
                  <path d="M8.69,11.52A1.32,1.32,0,1,0,10,10.2,1.32,1.32,0,0,0,8.69,11.52ZM19.1,6.56A9.42,9.42,0,0,0,12,3,9.49,9.49,0,0,0,3,12a9.42,9.42,0,0,0,3.56,7.1L5.51,22l3.46-1.72A9.41,9.41,0,0,0,12,21a9.49,9.49,0,0,0,9-9A9.42,9.42,0,0,0,19.1,6.56ZM7.4,15.78,4.05,17.9l.95-3.35a7.49,7.49,0,0,1-1.5-4.55A7.5,7.5,0,0,1,12,5,7.5,7.5,0,0,1,19.5,12,7.5,7.5,0,0,1,7.4,15.78Zm8.91-4.26A1.32,1.32,0,1,0,14,10.2,1.32,1.32,0,0,0,16.31,11.52Z"/>
                </svg>
                微信登录
              </span>
            </button>
            
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <span className="flex items-center justify-center">
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" fill="#4285F4"/>
                  <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" fill="#34A853" transform="translate(0 8)"/>
                  <path d="M0 0h24v24H0z" fill="none"/>
                </svg>
                Google登录
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal; 
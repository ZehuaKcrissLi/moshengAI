import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Google登录回调组件
const GoogleLogin: React.FC = () => {
  const { googleLogin } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<string>('初始化中...');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // 添加加载状态
  
  // 在组件挂载前获取URL参数，避免渲染错误状态
  const getInitialUrlParams = () => {
    const searchParams = new URLSearchParams(window.location.search);
    return {
      code: searchParams.get('code'),
      state: searchParams.get('state')
    };
  };
  
  // 预先获取URL参数
  const initialParams = getInitialUrlParams();
  
  useEffect(() => {
    // 使用setTimeout确保DOM完全加载
    const timer = setTimeout(() => {
      processAuth();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  const processAuth = async () => {
    // 防止重复处理
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      setIsLoading(true);
      
      // 调试信息
      setDebugInfo('正在解析URL参数...');
      
      // 使用预先获取的参数，而不是在这里重新获取
      const code = initialParams.code;
      const state = initialParams.state;
      const savedState = localStorage.getItem('google_auth_state') || sessionStorage.getItem('google_auth_state');
      const redirectUrl = localStorage.getItem('auth_redirect_url') || sessionStorage.getItem('auth_redirect_url') || '/';
      
      // 详细的调试信息
      setDebugInfo(`URL解析结果：
- code=${code ? code.substring(0, 10) + '...' : '不存在'}
- state=${state || '不存在'}
- savedState=${savedState || '不存在'}
- redirectUrl=${redirectUrl}
- localStorage keys: ${Object.keys(localStorage).join(', ')}
- sessionStorage keys: ${Object.keys(sessionStorage).join(', ')}
- 完整URL: ${window.location.href}
- 查询参数: ${window.location.search}
- User Agent: ${navigator.userAgent}
`);
      
      // 如果没有授权码，先不显示错误，继续等待
      if (!code) {
        setDebugInfo(prev => prev + '\n未找到授权码参数，等待重新检查...');
        
        // 再次检查URL，以防参数延迟加载
        const searchParams = new URLSearchParams(window.location.search);
        const recheckedCode = searchParams.get('code');
        
        if (recheckedCode) {
          setDebugInfo(prev => prev + '\n重新检查找到授权码，开始处理登录...');
          await processLoginWithCode(recheckedCode, redirectUrl);
        } else {
          // 如果重新检查仍然没有找到授权码，才显示错误
          setDebugInfo(prev => prev + '\n重新检查仍未找到授权码参数，无法继续');
          setError('登录失败：未接收到授权码');
          // 清除状态
          localStorage.removeItem('google_auth_state');
          sessionStorage.removeItem('google_auth_state');
        }
      } else {
        setDebugInfo(prev => prev + '\n找到授权码，开始处理登录...');
        await processLoginWithCode(code, redirectUrl);
      }
    } catch (error) {
      console.error('Google登录处理异常:', error);
      setDebugInfo(prev => prev + `\n处理异常: ${error instanceof Error ? error.message : String(error)}`);
      setError('登录处理过程中出错');
      // 清除状态
      localStorage.removeItem('google_auth_state');
      sessionStorage.removeItem('google_auth_state');
    } finally {
      setIsProcessing(false);
      setIsLoading(false);
    }
  };
  
  // 处理授权码登录的辅助函数
  const processLoginWithCode = async (code: string, redirectUrl: string) => {
    setDebugInfo(prev => prev + '\n尝试使用授权码登录...');
    
    try {
      // 立即清除状态，防止重复使用
      localStorage.removeItem('google_auth_state');
      sessionStorage.removeItem('google_auth_state');
      
      // 保存授权码到临时变量，然后清除URL中的参数
      const authCode = code;
      if (window.history && window.history.replaceState) {
        const cleanUrl = window.location.href.split('?')[0];
        window.history.replaceState({}, document.title, cleanUrl);
      }
      
      const response = await googleLogin(authCode);
      
      // 设置成功状态并显示用户信息
      setSuccess(true);
      setUserInfo(JSON.stringify(response.user, null, 2));
      setDebugInfo(prev => prev + '\n登录成功，准备重定向到原页面...');
      
      // 检查localStorage中的令牌和用户信息
      const token = localStorage.getItem('authToken');
      const user = localStorage.getItem('user');
      setDebugInfo(prev => prev + `\n登录状态检查:
- authToken: ${token ? '存在' : '不存在'}
- user: ${user ? '存在' : '不存在'}
`);
      
      // 在sessionStorage中设置登录成功标志，用于主页面显示欢迎消息
      sessionStorage.setItem('login_success', 'true');
      sessionStorage.setItem('login_time', Date.now().toString());
      
      // 登录成功后延迟重定向回原页面，给用户足够时间看到成功消息
      setTimeout(() => {
        // 在重定向前再次检查localStorage
        const finalCheck = {
          token: localStorage.getItem('authToken'),
          user: localStorage.getItem('user')
        };
        console.log('重定向前最终检查:', finalCheck);
        
        // 保存重定向URL，但移除auth_redirect_url以避免循环
        localStorage.removeItem('auth_redirect_url');
        sessionStorage.removeItem('auth_redirect_url');
        
        // 使用window.location而不是navigate，确保整个应用重新加载
        window.location.href = redirectUrl;
      }, 3000); // 延长到3秒，确保用户能看到成功消息
    } catch (error: any) {
      console.error('Google登录失败:', error);
      const errorMessage = error?.response?.data?.detail || '登录处理失败，请重试';
      setDebugInfo(prev => prev + `\n登录错误: ${errorMessage}`);
      setError(errorMessage);
    }
  };
  
  // 如果还在加载中，显示加载动画
  if (isLoading && !error && !success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <h2 className="mt-4 text-xl font-semibold text-gray-700">处理Google登录中...</h2>
          <p className="mt-2 text-gray-500">请稍候，正在验证您的Google账号</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md w-full">
        {error ? (
          <>
            <div className="text-red-500 text-4xl mb-4">×</div>
            <h2 className="text-xl font-semibold text-red-600 mb-2">登录失败</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-left overflow-auto max-h-60">
              <pre>{debugInfo}</pre>
            </div>
            <div className="mt-4 flex space-x-2 justify-center">
              <button 
                onClick={() => {
                  // 清除所有状态
                  localStorage.removeItem('google_auth_state');
                  sessionStorage.removeItem('google_auth_state');
                  localStorage.removeItem('auth_redirect_url');
                  sessionStorage.removeItem('auth_redirect_url');
                  // 返回首页
                  window.location.href = '/';
                }} 
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                返回首页
              </button>
              <button 
                onClick={() => {
                  // 重新尝试登录
                  const redirectUrl = localStorage.getItem('auth_redirect_url') || sessionStorage.getItem('auth_redirect_url') || '/';
                  localStorage.removeItem('google_auth_state');
                  sessionStorage.removeItem('google_auth_state');
                  localStorage.removeItem('auth_redirect_url');
                  sessionStorage.removeItem('auth_redirect_url');
                  window.location.href = redirectUrl;
                }} 
                className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                重新登录
              </button>
            </div>
          </>
        ) : success ? (
          <>
            <div className="text-green-500 text-4xl mb-4">✓</div>
            <h2 className="text-xl font-semibold text-green-600 mb-2">登录成功！</h2>
            <p className="text-gray-600 mb-4">您已成功登录，即将返回应用...</p>
            
            {userInfo && (
              <div className="mt-4 p-3 bg-green-50 rounded text-xs text-left overflow-auto max-h-40 border border-green-200">
                <p className="font-semibold mb-1">用户信息:</p>
                <pre>{userInfo}</pre>
              </div>
            )}
            
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-left overflow-auto max-h-40">
              <pre>{debugInfo}</pre>
            </div>
            
            <div className="mt-4">
              <button 
                onClick={() => {
                  const redirectUrl = localStorage.getItem('auth_redirect_url') || sessionStorage.getItem('auth_redirect_url') || '/';
                  localStorage.removeItem('auth_redirect_url');
                  sessionStorage.removeItem('auth_redirect_url');
                  window.location.href = redirectUrl;
                }} 
                className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                立即返回应用
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <h2 className="mt-4 text-xl font-semibold text-gray-700">处理Google登录中...</h2>
            <p className="mt-2 text-gray-500">请稍候，正在验证您的Google账号</p>
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-left overflow-auto max-h-60">
              <pre>{debugInfo}</pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleLogin; 
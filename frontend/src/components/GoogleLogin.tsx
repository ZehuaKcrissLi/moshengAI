import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Google登录回调组件
const GoogleLogin: React.FC = () => {
  const { googleLogin } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('初始化中...');
  
  useEffect(() => {
    const processAuth = async () => {
      try {
        // 调试信息
        setDebugInfo('正在解析URL参数...');
        
        // 从URL参数中获取授权码和状态
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const savedState = localStorage.getItem('google_auth_state');
        
        setDebugInfo(`URL解析结果：code=${code ? '存在' : '不存在'}, state=${state || '不存在'}, savedState=${savedState || '不存在'}`);
        
        // 验证state防止CSRF攻击
        if (!state || state !== savedState) {
          setDebugInfo('状态验证失败，可能是CSRF攻击');
          setError('登录失败：状态验证错误');
          window.opener?.postMessage({ type: 'google-login-error', error: '状态验证失败' }, '*');
          return;
        }
        
        if (code) {
          setDebugInfo('尝试使用授权码登录...');
          
          try {
            await googleLogin(code);
            setDebugInfo('登录成功，正在通知父窗口...');
            window.opener?.postMessage({ type: 'google-login-success' }, '*');
            // 延迟关闭窗口，确保消息发送
            setTimeout(() => window.close(), 1000);
          } catch (error: any) {
            console.error('Google登录失败:', error);
            const errorMessage = error?.response?.data?.detail || '登录处理失败，请重试';
            setDebugInfo(`登录错误: ${errorMessage}`);
            setError(errorMessage);
            
            // 如果是授权码已使用，提示用户重新登录
            if (errorMessage.includes('授权码已过期') || errorMessage.includes('已被使用')) {
              window.opener?.postMessage({ 
                type: 'google-login-error', 
                error: 'auth_code_used',
                message: '授权码已失效，请重新登录' 
              }, '*');
            } else {
              window.opener?.postMessage({ 
                type: 'google-login-error', 
                error: errorMessage 
              }, '*');
            }
          }
        } else {
          setDebugInfo('未找到授权码参数');
          setError('登录失败：未接收到授权码');
          window.opener?.postMessage({ 
            type: 'google-login-error', 
            error: '未接收到授权码' 
          }, '*');
        }
      } catch (error) {
        console.error('Google登录处理异常:', error);
        setDebugInfo(`处理异常: ${error instanceof Error ? error.message : String(error)}`);
        setError('登录处理过程中出错');
        window.opener?.postMessage({ 
          type: 'google-login-error', 
          error: '处理异常' 
        }, '*');
      }
    };
    
    processAuth();
  }, [googleLogin]);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md w-full">
        {error ? (
          <>
            <div className="text-red-500 text-4xl mb-4">×</div>
            <h2 className="text-xl font-semibold text-red-600 mb-2">登录失败</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-left overflow-auto max-h-40">
              <pre>{debugInfo}</pre>
            </div>
            <button 
              onClick={() => window.close()} 
              className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              关闭窗口
            </button>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <h2 className="mt-4 text-xl font-semibold text-gray-700">处理Google登录中...</h2>
            <p className="mt-2 text-gray-500">请稍候，正在验证您的Google账号</p>
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-left overflow-auto max-h-40">
              <pre>{debugInfo}</pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleLogin; 
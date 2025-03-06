import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// 微信登录回调组件
const WechatLogin: React.FC = () => {
  const { wechatLogin } = useAuth();
  
  useEffect(() => {
    // 从URL中获取code参数
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      // 处理微信登录
      const handleWechatLogin = async () => {
        try {
          await wechatLogin(code);
          // 登录成功后关闭窗口或重定向
          window.opener?.postMessage({ type: 'wechat-login-success' }, '*');
          window.close();
        } catch (error) {
          console.error('微信登录失败:', error);
          // 登录失败后通知父窗口
          window.opener?.postMessage({ type: 'wechat-login-error', error }, '*');
          window.close();
        }
      };
      
      handleWechatLogin();
    }
  }, [wechatLogin]);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <h2 className="mt-4 text-xl font-semibold text-gray-700">处理微信登录中...</h2>
        <p className="mt-2 text-gray-500">请稍候，正在验证您的微信账号</p>
      </div>
    </div>
  );
};

export default WechatLogin; 
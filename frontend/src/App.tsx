import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import './App.css'
import ChatInterface from './components/ChatInterface'
import Sidebar from './components/Sidebar'
import LogoIcon from './components/LogoIcon'
import WechatLogin from './components/WechatLogin'
import GoogleLogin from './components/GoogleLogin'
import UserInfo from './components/UserInfo'
import { useAuth } from './contexts/AuthContext'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLoginSuccess, setShowLoginSuccess] = useState(false);
  const { user } = useAuth();
  
  // 检查是否刚刚登录成功
  useEffect(() => {
    const loginSuccess = sessionStorage.getItem('login_success');
    const loginTime = sessionStorage.getItem('login_time');
    
    // 只有在最近5秒内登录成功才显示提示
    if (loginSuccess === 'true' && loginTime) {
      const timeElapsed = Date.now() - parseInt(loginTime);
      if (timeElapsed < 5000) {
        setShowLoginSuccess(true);
        
        // 5秒后自动隐藏提示
        const timer = setTimeout(() => {
          setShowLoginSuccess(false);
          sessionStorage.removeItem('login_success');
          sessionStorage.removeItem('login_time');
        }, 5000);
        
        return () => clearTimeout(timer);
      } else {
        // 如果登录时间超过5秒，清除登录成功标志
        sessionStorage.removeItem('login_success');
        sessionStorage.removeItem('login_time');
      }
    }
  }, []);

  return (
    <Router>
      <div className="w-full h-full fixed inset-0 flex overflow-hidden">
        {/* 侧边栏 */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 flex-shrink-0 border-r border-gray-200 bg-white overflow-hidden`}>
          <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        </div>
        
        {/* 主内容区 */}
        <div className="flex flex-col flex-1 w-full h-full overflow-hidden">
          {/* 顶部导航 */}
          <header className="flex-shrink-0 bg-white shadow-sm z-10 border-b border-gray-200">
            <div className="flex items-center justify-between h-14 px-4">
              <div className="flex items-center">
                <button 
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="mr-4 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div className="flex items-center">
                  <LogoIcon className="h-8 w-8 text-primary-600" />
                  <h1 className="ml-2 text-xl font-semibold text-gray-800">魔声AI</h1>
                  <span className="ml-2 text-sm text-gray-500">AI商业多语言配音</span>
                </div>
              </div>
              
              {/* 用户信息显示 */}
              <div className="flex items-center">
                <UserInfo />
                <LoginStatus />
              </div>
            </div>
          </header>
          
          {/* 登录成功提示 */}
          {showLoginSuccess && user && (
            <div className="fixed top-16 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md z-50 animate-fade-in-down">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">
                    欢迎回来，{user.username}！登录成功
                  </p>
                </div>
                <div className="ml-auto pl-3">
                  <div className="-mx-1.5 -my-1.5">
                    <button
                      onClick={() => setShowLoginSuccess(false)}
                      className="inline-flex bg-green-100 text-green-500 rounded-md p-1.5 hover:bg-green-200 focus:outline-none"
                    >
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 主要内容 */}
          <main className="flex-1 w-full h-full overflow-hidden bg-white">
            <Routes>
              <Route path="/" element={<ChatInterface />} />
              <Route path="/chat/:id" element={<ChatInterface />} />
              <Route path="/auth/wechat-callback" element={<WechatLogin />} />
              <Route path="/auth/google-callback" element={<GoogleLogin />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  )
}

// 登录状态显示组件
const LoginStatus = () => {
  const { isAuthenticated, user } = useAuth();
  
  if (isAuthenticated && user) {
    return null; // UserInfo组件已经显示了用户信息
  }
  
  return (
    <div className="text-sm text-gray-600">
      <span>未登录</span>
    </div>
  );
};

// 添加淡入动画
const style = document.createElement('style');
style.textContent = `
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translate3d(0, -20px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}
.animate-fade-in-down {
  animation: fadeInDown 0.5s ease-out;
}
`;
document.head.appendChild(style);

export default App

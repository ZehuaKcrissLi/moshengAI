import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import './App.css'
import ChatInterface from './components/ChatInterface'
import Sidebar from './components/Sidebar'
import LogoIcon from './components/LogoIcon'
import WechatLogin from './components/WechatLogin'
import GoogleLogin from './components/GoogleLogin'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
            <div className="flex items-center h-14 px-4">
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
          </header>
          
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

export default App

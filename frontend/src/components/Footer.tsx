import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h2 className="text-xl font-bold">魔音AI</h2>
            <p className="text-gray-400 text-sm">高品质AI商业英文配音服务</p>
          </div>
          <div className="flex flex-col space-y-2">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">关于我们</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">使用条款</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">隐私政策</a>
          </div>
        </div>
        <div className="mt-6 border-t border-gray-700 pt-6 text-center text-gray-400 text-sm">
          &copy; {new Date().getFullYear()} 魔音AI. 保留所有权利。
        </div>
      </div>
    </footer>
  );
};

export default Footer; 
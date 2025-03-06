import React from 'react';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center">
          <h1 className="text-2xl font-bold text-primary-600">魔声AI</h1>
          <span className="ml-2 text-sm text-gray-500">AI商业多语种配音</span>
        </Link>
        <nav className="flex space-x-4">
          <Link to="/" className="text-gray-600 hover:text-primary-600 transition-colors">
            首页
          </Link>
          <Link to="/samples" className="text-gray-600 hover:text-primary-600 transition-colors">
            示例库
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header; 
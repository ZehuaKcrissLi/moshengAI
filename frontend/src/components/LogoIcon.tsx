import React from 'react';

interface LogoIconProps {
  className?: string;
}

const LogoIcon: React.FC<LogoIconProps> = ({ className = 'h-6 w-6' }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className={className}
    >
      {/* 音频波形图标 - 代表音频配音 */}
      <path d="M9 2a1 1 0 00-1 1v18a1 1 0 102 0V3a1 1 0 00-1-1zm3 3a1 1 0 00-1 1v12a1 1 0 102 0V6a1 1 0 00-1-1zm6 0a1 1 0 00-1 1v12a1 1 0 102 0V6a1 1 0 00-1-1zM6 7a1 1 0 00-1 1v8a1 1 0 102 0V8a1 1 0 00-1-1z" />
      {/* 魔法星星 - 代表"魔"字 */}
      <path d="M2.5 11.5c1.5-1 3.5-1 5 0M2.5 8c2.5-1.5 5.5-1.5 8 0" opacity="0.6" strokeWidth="2" stroke="currentColor" fill="none" />
    </svg>
  );
};

export default LogoIcon; 
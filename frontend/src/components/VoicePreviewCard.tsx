import React, { useState } from 'react';

interface VoicePreviewCardProps {
  id: string;
  label: string;
  gender: string;
  audioUrl?: string;
  isLoading: boolean;
  isSelected: boolean;
  onConfirm: () => void;
}

const VoicePreviewCard: React.FC<VoicePreviewCardProps> = ({
  label,
  gender,
  audioUrl,
  isLoading,
  isSelected,
  onConfirm
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  // 音色类型（从标签中提取关键词）
  const extractVoiceType = () => {
    if (label.includes('激情')) return '激情';
    if (label.includes('浑厚')) return '浑厚';
    if (label.includes('磁性')) return '磁性';
    if (label.includes('大气')) return '大气';
    if (label.includes('温情')) return '温情';
    if (label.includes('亲切')) return '亲切';
    if (label.includes('知性')) return '知性';
    return '标准';
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(error => {
          console.error("音频播放失败:", error);
          setIsPlaying(false);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  // 默认头像，基于性别
  const avatarUrl = gender === '男声' 
    ? '/assets/default-male-avatar.svg' 
    : '/assets/default-female-avatar.svg';

  // 提取序号（如果有）
  const voiceNumber = label.match(/\d+/) ? label.match(/\d+/)?.[0] : '';

  return (
    <div 
      className={`relative p-4 rounded-lg shadow-sm transition-all ${
        isSelected 
          ? 'border-2 border-primary-500 bg-primary-50' 
          : 'border border-gray-200 hover:border-primary-300 hover:shadow-md'
      }`}
    >
      {/* 音色标签，顶部展示 */}
      <div className="absolute top-2 right-2">
        <span className={`invisible inline-block px-2 py-1 text-xs font-normal rounded-full ${
          gender === '男声' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
        }`}>
          {extractVoiceType()}
        </span>
      </div>

      <div className="flex items-center mb-3">
        {/* 配音员头像 */}
        <div className="relative w-12 h-12 mr-3 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
          <img 
            src={avatarUrl} 
            alt={`${label} 配音员头像`}
            className="w-full h-full object-cover"
            onError={(e) => {
              // 图片加载失败时显示首字母
              (e.target as HTMLImageElement).style.display = 'none';
              e.currentTarget.parentElement!.innerHTML += `
                <div class="absolute inset-0 flex items-center justify-center bg-primary-100 text-primary-700 text-lg font-bold">
                  ${voiceNumber || label.charAt(0)}
                </div>
              `;
            }}
          />
        </div>

        {/* 音色信息 */}
        <div className="flex-grow">
          <h4 className="font-lower text-gray-900">{label}</h4>
          {/* <p className="text-xs text-gray-500">{gender} · 专业配音</p> */}
        </div>
      </div>

      {/* 音频播放器区域 - 使用新的 handlePlayPause */}
      <div className="mb-3 bg-gray-50 rounded-md p-2 flex items-center space-x-2">
        {audioUrl ? (
          <>
            <button
              onClick={handlePlayPause}
              className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center transition-colors ${ 
                isPlaying ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
              }`}
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
              )}
            </button>
            <audio 
              ref={audioRef} 
              src={audioUrl} 
              onEnded={handleAudioEnded}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              preload="metadata"
              className="hidden"
            />
            <span className="text-xs text-gray-500 flex-grow truncate">
              {isPlaying ? '正在播放...' : '点击播放试听'}
            </span>
          </>
        ) : (
          <div className="flex items-center justify-center py-2 text-sm text-gray-500 w-full">
            {isLoading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                正在生成音频...
              </div>
            ) : (
              <span>无法加载预览</span>
            )}
          </div>
        )}
      </div>

      {/* 操作按钮 - 只保留 "使用此音色" */}
      <div className="flex">
        <button
          onClick={onConfirm}
          className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${ 
            isLoading 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-primary-500 text-white hover:bg-primary-600'
          }`}
          disabled={isLoading}
        >
          <div className="flex items-center justify-center">
            {isLoading ? (
              <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {isLoading ? '合成中...' : '使用此音色'}
          </div>
        </button>
      </div>
    </div>
  );
};

export default VoicePreviewCard; 
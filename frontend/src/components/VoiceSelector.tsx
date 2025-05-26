import React, { useState } from 'react';
import VoicePreviewCard from './VoicePreviewCard';

export interface Voice {
  id: string;
  label: string;
  gender: string;
  audioUrl?: string;
  isLoading: boolean;
}

interface VoiceSelectorProps {
  maleVoices: Voice[];
  femaleVoices: Voice[];
  selectedVoiceId: string | null;
  onPreviewVoice: (voice: Voice) => void;
  onConfirmVoice: (voice: Voice) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  confirmingVoiceId?: string | null;
}

// 骨架屏组件 - 完全复制VoicePreviewCard的结构，只替换内容为占位符
const VoiceCardSkeleton: React.FC = () => (
  <div className="relative p-4 rounded-lg shadow-sm border border-gray-200 animate-pulse">
    {/* 音色标签，顶部展示 */}
    <div className="absolute top-2 right-2">
      <span className="invisible inline-block px-2 py-1 text-xs font-normal rounded-full bg-blue-100 text-blue-800">
        标准
      </span>
    </div>

    <div className="flex items-center mb-3">
      {/* 配音员头像 */}
      <div className="relative w-12 h-12 mr-3 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
        {/* 占位头像 */}
      </div>

      {/* 音色信息 */}
      <div className="flex-grow">
        <div className="font-lower text-gray-900 h-5 bg-gray-200 rounded w-3/4"></div>
      </div>
    </div>

    {/* 音频播放器区域 */}
    <div className="mb-3 bg-gray-50 rounded-md p-2 flex items-center space-x-2">
      <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gray-200"></div>
      <div className="text-xs text-gray-500 flex-grow truncate h-4 bg-gray-200 rounded"></div>
    </div>

    {/* 操作按钮 */}
    <div className="flex">
      <div className="flex-1 py-2 text-sm font-medium rounded bg-gray-200">
        <div className="flex items-center justify-center">
          <div className="h-4 w-4 mr-1 bg-gray-300 rounded"></div>
          <div className="h-4 bg-gray-300 rounded w-16"></div>
        </div>
      </div>
    </div>
  </div>
);

// 现代化的加载动画组件
const LoadingSpinner: React.FC = () => (
  <div className="inline-flex items-center">
    <svg className="animate-spin h-3 w-3 mr-1.5" viewBox="0 0 24 24">
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
        fill="none"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
    <span className="text-xs">更新中...</span>
  </div>
);

const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  maleVoices,
  femaleVoices,
  selectedVoiceId,
  onPreviewVoice,
  onConfirmVoice,
  onRefresh,
  isLoading = false,
  confirmingVoiceId
}) => {
  const [activeTab, setActiveTab] = useState<'male' | 'female'>('male');
  
  return (
    <div className="voice-selector mt-4 sm:mt-5 bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Title Bar: Adjust padding and text size */}
      <div className="p-3 sm:p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">推荐音色</h3>
          
          {onRefresh && (
            <button 
              onClick={onRefresh}
              disabled={isLoading}
              className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                isLoading 
                  ? 'text-gray-500 bg-gray-100 cursor-not-allowed' 
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200 hover:text-gray-900 active:scale-95'
              }`}
            >
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>换一批</span>
                </>
              )}
            </button>
          )}
        </div>
        
        <p className="mt-1 text-xs sm:text-sm text-gray-500">
          根据您的内容，我们为您精选了以下专业音色，点击试听并选择最合适的一个
        </p>
      </div>
      
      {/* Tabs: Adjust padding and text size */}
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${
            activeTab === 'male'
              ? 'text-primary-600 border-b-2 border-primary-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('male')}
          disabled={isLoading}
        >
          男声 ({isLoading ? '...' : maleVoices.length})
        </button>
        <button
          className={`flex-1 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${
            activeTab === 'female'
              ? 'text-primary-600 border-b-2 border-primary-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('female')}
          disabled={isLoading}
        >
          女声 ({isLoading ? '...' : femaleVoices.length})
        </button>
      </div>
      
      {/* Card Grid: Adjust columns based on screen size */}
      <div className="p-3 sm:p-4">
        {/* Default to 1 column, 2 on md+, 3 on lg+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {isLoading ? (
            // 显示骨架屏
            Array.from({ length: 6 }).map((_, index) => (
              <VoiceCardSkeleton key={`skeleton-${index}`} />
            ))
          ) : (
            activeTab === 'male' ? (
              maleVoices.length > 0 ? (
                maleVoices.map(voice => (
                  <VoicePreviewCard
                    key={voice.id}
                    id={voice.id}
                    label={voice.label}
                    gender={voice.gender}
                    audioUrl={voice.audioUrl}
                    isLoading={confirmingVoiceId === voice.id}
                    isSelected={selectedVoiceId === voice.id}
                    onPreview={() => onPreviewVoice(voice)}
                    onConfirm={() => onConfirmVoice(voice)}
                  />
                ))
              ) : (
                <div className="col-span-full py-6 sm:py-8 text-center text-gray-500 text-sm">
                  <p>没有找到符合条件的男声音色</p>
                </div>
              )
            ) : (
              femaleVoices.length > 0 ? (
                femaleVoices.map(voice => (
                  <VoicePreviewCard
                    key={voice.id}
                    id={voice.id}
                    label={voice.label}
                    gender={voice.gender}
                    audioUrl={voice.audioUrl}
                    isLoading={confirmingVoiceId === voice.id}
                    isSelected={selectedVoiceId === voice.id}
                    onPreview={() => onPreviewVoice(voice)}
                    onConfirm={() => onConfirmVoice(voice)}
                  />
                ))
              ) : (
                <div className="col-span-full py-6 sm:py-8 text-center text-gray-500 text-sm">
                  <p>没有找到符合条件的女声音色</p>
                </div>
              )
            )
          )}
        </div>
      </div>
      
      {/* Footer: Adjust padding and text size */}
      <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <p className="text-xs sm:text-sm text-gray-500 text-center">
          音色由魔声AI提供 · 支持商业使用 · 选择合适的音色将大幅提升配音效果
        </p>
      </div>
    </div>
  );
};

export { VoiceSelector }; 
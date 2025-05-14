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
              className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                isLoading 
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isLoading ? '加载中...' : '换一批'}
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
          className={`flex-1 py-2 sm:py-3 text-xs sm:text-sm font-medium ${
            activeTab === 'male'
              ? 'text-primary-600 border-b-2 border-primary-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('male')}
        >
          男声 ({maleVoices.length})
        </button>
        <button
          className={`flex-1 py-2 sm:py-3 text-xs sm:text-sm font-medium ${
            activeTab === 'female'
              ? 'text-primary-600 border-b-2 border-primary-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('female')}
        >
          女声 ({femaleVoices.length})
        </button>
      </div>
      
      {/* Card Grid: Adjust columns based on screen size */}
      <div className="p-3 sm:p-4">
        {/* Default to 1 column, 2 on md+, 3 on lg+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {activeTab === 'male' ? (
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
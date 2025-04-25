import React, { useState } from 'react';
import SmartTTSForm from './SmartTTSForm';
import AudioPlayer from './AudioPlayer';

const TTSPage: React.FC = () => {
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [audioPending, setAudioPending] = useState(false);

  // 处理合成完成的回调
  const handleSynthesisComplete = (audioUrl: string) => {
    setCurrentAudioUrl(audioUrl);
    setAudioPending(false);
  };

  // 下载音频
  const handleDownload = () => {
    if (currentAudioUrl) {
      const link = document.createElement('a');
      link.href = currentAudioUrl;
      link.download = '魔声AI合成音频.mp3';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="tts-page">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">魔声AI配音助手</h1>
          <p className="text-gray-600">
            输入您想要配音的文本，我们将为您生成专业的语音合成结果
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <SmartTTSForm onSynthesisComplete={handleSynthesisComplete} />
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">音频播放</h2>
            {currentAudioUrl ? (
              <AudioPlayer
                audioUrl={currentAudioUrl}
                onDownload={handleDownload}
                accent="智能合成"
                voiceStyle="专业配音"
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                {audioPending ? (
                  <div className="animate-pulse">
                    <p>正在生成音频...</p>
                  </div>
                ) : (
                  <p>完成文本分析和音色选择后，合成的音频将在此播放</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TTSPage; 
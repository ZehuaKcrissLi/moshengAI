import React, { useEffect, useRef, useState } from 'react';
import { Howl } from 'howler';

interface AudioPlayerProps {
  audioUrl: string;
  onDownload?: () => void;
  accent?: string;
  voiceStyle?: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  audioUrl, 
  onDownload,
  accent = "美式口音",
  voiceStyle = "专业" 
}) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const soundRef = useRef<Howl | null>(null);
  const progressTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // 初始化音频
    soundRef.current = new Howl({
      src: [audioUrl],
      html5: true,
      onload: () => {
        const dur = soundRef.current?.duration() || 0;
        setDuration(dur);
      },
      onend: () => {
        setPlaying(false);
        setProgress(0);
        if (progressTimerRef.current) {
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
      }
    });

    return () => {
      if (soundRef.current) {
        soundRef.current.stop();
      }
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!soundRef.current) return;
    
    if (playing) {
      soundRef.current.pause();
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    } else {
      soundRef.current.play();
      progressTimerRef.current = window.setInterval(() => {
        if (soundRef.current) {
          setProgress(soundRef.current.seek() as number);
        }
      }, 100);
    }
    
    setPlaying(!playing);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!soundRef.current || !duration) return;
    
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const seekTime = duration * percent;
    
    soundRef.current.seek(seekTime);
    setProgress(seekTime);
  };

  return (
    <div className="bg-gray-50 rounded-md p-3">
      {accent && voiceStyle && (
        <div className="flex mb-2">
          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{accent}</span>
          <span className="mx-1 text-xs text-gray-400">•</span>
          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{voiceStyle}</span>
        </div>
      )}
      
      <div className="flex items-center">
        <button 
          onClick={togglePlay}
          className="w-9 h-9 flex items-center justify-center bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          aria-label={playing ? '暂停' : '播放'}
        >
          {playing ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          )}
        </button>
        
        <div className="flex-1 mx-3">
          <div 
            className="h-2 bg-gray-200 rounded-full overflow-hidden cursor-pointer"
            onClick={handleProgressClick}
          >
            <div 
              className="h-full bg-primary-500 transition-all duration-100"
              style={{ width: `${(progress / duration) * 100}%` }} 
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        {onDownload && (
          <button 
            onClick={onDownload}
            className="text-primary-600 hover:text-primary-700 focus:outline-none"
            aria-label="下载音频"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
      
      {/* 波形可视化 (仅UI装饰) */}
      <div className="mt-2 flex items-center justify-center space-x-1 h-4">
        {Array.from({ length: 40 }).map((_, i) => (
          <div 
            key={i}
            className="w-0.5 bg-primary-300 opacity-50"
            style={{
              height: `${Math.max(15, Math.sin(i * 0.5) * 25 + 5)}%`,
              opacity: playing ? 0.7 : 0.3,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default AudioPlayer; 
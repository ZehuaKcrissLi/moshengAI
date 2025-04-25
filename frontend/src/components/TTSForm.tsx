import React, { useState } from 'react';
import { ttsAPI } from '../services/api';

interface TTSFormProps {
  onSynthesisComplete: (audioUrl: string) => void;
}

const TTSForm: React.FC<TTSFormProps> = ({ onSynthesisComplete }) => {
  const [text, setText] = useState<string>('');
  const [gender, setGender] = useState<string>('女');
  const [voice, setVoice] = useState<string>('chunky');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const MAX_CHARS = 200;

  const handleSynthesis = async () => {
    if (!text) {
      setError('请输入要转换的文本');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await ttsAPI.synthesize(text, gender, voice);
      // 优先使用mp3_url，如果不存在则使用wav_url
      const audioUrl = response.mp3_url || response.wav_url;
      if (audioUrl) {
        onSynthesisComplete(audioUrl);
      } else {
        throw new Error('服务器返回的音频 URL 无效');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '音频合成失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!text) {
      setError('请输入要转换的文本');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 只传递必要参数：text, gender, voice
      const response = await ttsAPI.confirmScript(text, gender, voice);
      // 优先使用mp3_url，如果不存在则使用wav_url
      const audioUrl = response.mp3_url || response.wav_url;
      if (audioUrl) {
        onSynthesisComplete(audioUrl);
      } else {
        throw new Error('服务器返回的音频 URL 无效');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '语音确认失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">语音合成</h3>
      
      <div className="mb-4">
        <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">
          输入文本
        </label>
        <textarea 
          id="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="请输入要转换为语音的文本..."
          className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
          rows={4}
          maxLength={MAX_CHARS}
        />
        <p className={`text-xs mt-1 ${text.length > MAX_CHARS * 0.8 ? "text-orange-500" : "text-gray-500"}`}>
          {text.length}/{MAX_CHARS}, 最大字符数: {MAX_CHARS}
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
        <div className="flex space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio text-blue-600"
              checked={gender === '男'}
              onChange={() => setGender('男')}
            />
            <span className="ml-2">男</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio text-blue-600"
              checked={gender === '女'}
              onChange={() => setGender('女')}
            />
            <span className="ml-2">女</span>
          </label>
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="voice" className="block text-sm font-medium text-gray-700 mb-1">声音</label>
        <select 
          id="voice" 
          value={voice} 
          onChange={(e) => setVoice(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="chunky">高级语音(默认)</option>
          <option value="zh-CN-XiaoxiaoNeural">标准语音</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 text-sm bg-red-50 text-red-600 rounded-md border border-red-200">
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <button 
          className={`px-4 py-2 rounded-md ${isLoading || !text.trim() 
            ? 'bg-blue-300 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          disabled={isLoading || !text.trim()}
          onClick={handleSynthesis}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              处理中...
            </span>
          ) : '预览'}
        </button>
        <button 
          className={`px-4 py-2 rounded-md ${isLoading || !text.trim() 
            ? 'bg-green-300 cursor-not-allowed' 
            : 'bg-green-600 hover:bg-green-700 text-white'}`}
          disabled={isLoading || !text.trim()}
          onClick={handleConfirm}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              处理中...
            </span>
          ) : '确认合成'}
        </button>
      </div>
    </div>
  );
};

export default TTSForm; 
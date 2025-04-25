import React, { useState, useEffect } from 'react';
import { ttsAPI, VoiceTypes } from '../services/api';
import '../styles/TTSForm.css';

interface TTSFormProps {
  onSynthesisComplete: (audioUrl: string) => void;
}

const TTSForm: React.FC<TTSFormProps> = ({ onSynthesisComplete }) => {
  const [text, setText] = useState('');
  const [gender, setGender] = useState('male');
  const [voice, setVoice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [voiceTypes, setVoiceTypes] = useState<VoiceTypes>({
    male: [],
    female: []
  });

  useEffect(() => {
    const fetchVoiceTypes = async () => {
      try {
        const response = await ttsAPI.getVoiceTypes();
        setVoiceTypes(response);
        
        // 设置默认语音
        if (response.male?.length > 0) {
          setVoice(response.male[0]);
        } else if (response.female?.length > 0) {
          setGender('female');
          setVoice(response.female[0]);
        }
      } catch (err) {
        console.error('获取语音类型失败:', err);
        setError('无法加载可用语音类型');
      }
    };

    fetchVoiceTypes();
  }, []);

  const handleSynthesis = async () => {
    if (!text.trim() || !voice) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await ttsAPI.synthesize(text, gender, voice);
      
      // 检查返回的URL，可能是mp3_url或wav_url
      const audioUrl = response.mp3_url || response.wav_url;
      
      if (audioUrl) {
        onSynthesisComplete(audioUrl);
      } else {
        setError('服务器未返回可用的音频URL');
      }
    } catch (err) {
      console.error('合成失败:', err);
      setError('语音合成失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!text.trim() || !voice) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await ttsAPI.confirmScript(text, gender, voice);
      
      // 检查返回的URL，可能是mp3_url或wav_url
      const audioUrl = response.mp3_url || response.wav_url;
      
      if (audioUrl) {
        onSynthesisComplete(audioUrl);
      } else {
        setError('服务器未返回可用的音频URL');
      }
    } catch (err) {
      console.error('确认脚本失败:', err);
      setError('确认脚本失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };
  
  const textLengthLimit = 500;
  
  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="mb-4">
        <label htmlFor="text-input" className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
          输入文本
          <span className={`text-xs ${text.length > textLengthLimit * 0.8 ? 'text-amber-500' : 'text-gray-500'}`}>
            {text.length}/{textLengthLimit}
          </span>
        </label>
        <textarea
          id="text-input"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          value={text}
          onChange={(e) => {
            if (e.target.value.length <= textLengthLimit) {
              setText(e.target.value);
            }
          }}
          placeholder="请输入需要转换为语音的文本..."
          disabled={isLoading}
          maxLength={textLengthLimit}
          rows={5}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">选择性别</label>
        <div className="flex space-x-4">
          {Object.keys(voiceTypes).map(genderOption => (
            voiceTypes[genderOption as keyof VoiceTypes]?.length > 0 && (
              <label 
                key={genderOption}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md cursor-pointer ${
                  gender === genderOption 
                    ? 'bg-primary-100 border border-primary-300 text-primary-700' 
                    : 'bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="gender"
                  value={genderOption}
                  checked={gender === genderOption}
                  onChange={() => {
                    setGender(genderOption);
                    // 更新选择的声音为当前性别的第一个选项
                    const voices = voiceTypes[genderOption as keyof VoiceTypes];
                    if (voices && voices.length > 0) {
                      setVoice(voices[0]);
                    }
                  }}
                  className="sr-only"
                />
                <span>{genderOption === 'male' ? '男声' : '女声'}</span>
              </label>
            )
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">选择语音</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {voiceTypes[gender as keyof VoiceTypes]?.map((voiceOption) => (
            <button
              key={voiceOption}
              className={`px-4 py-2 rounded-md text-sm focus:outline-none transition-colors ${
                voice === voiceOption 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setVoice(voiceOption)}
              type="button"
            >
              {voiceOption}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
          <svg className="w-5 h-5 inline-block mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 9a1 1 0 01-1-1v-4a1 1 0 112 0v4a1 1 0 01-1 1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <div className="flex space-x-3">
        <button
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isLoading || !text.trim() || !voice
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-primary-100 text-primary-700 hover:bg-primary-200 focus:ring-primary-500'
          }`}
          onClick={handleSynthesis}
          disabled={isLoading || !text.trim() || !voice}
          type="button"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              处理中...
            </span>
          ) : '预览'}
        </button>
        <button
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isLoading || !text.trim() || !voice
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500'
          }`}
          onClick={handleConfirm}
          disabled={isLoading || !text.trim() || !voice}
          type="button"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              处理中...
            </span>
          ) : '确认'}
        </button>
      </div>
    </div>
  );
};

export default TTSForm; 
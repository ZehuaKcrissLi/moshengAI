import React, { useState } from 'react';
import { ttsAPI } from '../services/api';
import '../styles/TTSForm.css';

interface TTSFormProps {
  onSynthesisComplete: (audioUrl: string) => void;
}

const TTSForm: React.FC<TTSFormProps> = ({ onSynthesisComplete }) => {
  const [text, setText] = useState('');
  const [gender, setGender] = useState('');
  const [voice, setVoice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSynthesis = async () => {
    if (!text.trim()) {
      setError('请输入要合成的文本');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await ttsAPI.synthesize(text, gender, voice);
      onSynthesisComplete(response.mp3_url);
    } catch (err) {
      setError('语音合成失败，请重试');
      console.error('Synthesis error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!text.trim()) {
      setError('请输入要合成的文本');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await ttsAPI.confirmScript(text, gender, voice);
      onSynthesisComplete(response.mp3_url);
    } catch (err) {
      setError('确认失败，请重试');
      console.error('Confirmation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tts-form">
      <div className="form-group">
        <label>输入文本</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="请输入要合成的文本"
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label>选择性别</label>
        <select
          value={gender}
          onChange={(e) => {
            setGender(e.target.value);
            setVoice('');
          }}
          disabled={isLoading}
        >
          <option value="">请选择性别</option>
          <option value="male">男声</option>
          <option value="female">女声</option>
        </select>
      </div>

      {gender && (
        <div className="form-group">
          <label>选择音色</label>
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            disabled={isLoading}
          >
            <option value="">请选择音色</option>
            <option value="default">默认音色</option>
          </select>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <div className="button-group">
        <button
          onClick={handleSynthesis}
          disabled={isLoading || !text.trim() || !voice}
        >
          试听
        </button>
        <button
          onClick={handleConfirm}
          disabled={isLoading || !text.trim() || !voice}
        >
          确认使用
        </button>
      </div>
    </div>
  );
};

export default TTSForm; 
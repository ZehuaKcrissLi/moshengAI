import React, { useState, useEffect } from 'react';
import { ttsAPI, ScriptAnalysisResponse, RecommendedVoicesResponse } from '../services/api';
import '../styles/SmartTTSForm.css';

interface SmartTTSFormProps {
  onSynthesisComplete: (audioUrl: string) => void;
}

// 表单步骤枚举
enum FormStep {
  SCRIPT_INPUT = 'script_input',
  SCRIPT_CONFIRMATION = 'script_confirmation',
  VOICE_SELECTION = 'voice_selection',
  FINAL_CONFIRMATION = 'final_confirmation'
}

const SmartTTSForm: React.FC<SmartTTSFormProps> = ({ onSynthesisComplete }) => {
  // 状态管理
  const [step, setStep] = useState<FormStep>(FormStep.SCRIPT_INPUT);
  const [originalText, setOriginalText] = useState('');
  const [standardizedText, setStandardizedText] = useState('');
  const [styleTags, setStyleTags] = useState<string[]>([]);
  const [recommendedVoices, setRecommendedVoices] = useState<{ [gender: string]: string[] }>({});
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [previewUrls, setPreviewUrls] = useState<{ [key: string]: string }>({});
  const [currentPlayingAudio, setCurrentPlayingAudio] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 处理文本输入
  const handleTextInput = async () => {
    if (!originalText.trim()) {
      setError('请输入要合成的文本');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 调用DeepSeek分析文稿
      const analysisResult = await ttsAPI.analyzeScript(originalText);
      
      // 更新状态
      setStandardizedText(analysisResult.standardized_text);
      setStyleTags(analysisResult.recommended_style_tags);
      
      // 转到下一步
      setStep(FormStep.SCRIPT_CONFIRMATION);
    } catch (err) {
      setError('文稿分析失败，请重试');
      console.error('Script analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理文稿确认
  const handleScriptConfirmation = async (confirmed: boolean) => {
    if (!confirmed) {
      // 返回上一步
      setStep(FormStep.SCRIPT_INPUT);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 获取推荐音色
      const recommendResult = await ttsAPI.recommendVoices(styleTags);
      
      // 更新状态
      setRecommendedVoices(recommendResult.recommended_voices);
      
      // 转到下一步
      setStep(FormStep.VOICE_SELECTION);
    } catch (err) {
      setError('获取推荐音色失败，请重试');
      console.error('Voice recommendation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载音色预览
  const loadVoicePreview = async (gender: string, voiceLabel: string) => {
    const key = `${gender}_${voiceLabel}`;
    
    // 如果已有预览，直接返回
    if (previewUrls[key]) {
      return previewUrls[key];
    }
    
    try {
      // 获取预览URL
      const previewUrl = await ttsAPI.getVoicePreview(
        standardizedText.substring(0, 100), // 使用前100个字符作为预览
        gender,
        voiceLabel
      );
      
      // 更新预览URL状态
      setPreviewUrls(prev => ({
        ...prev,
        [key]: previewUrl
      }));
      
      return previewUrl;
    } catch (err) {
      console.error(`Failed to load preview for ${gender} ${voiceLabel}:`, err);
      setError(`加载${gender} ${voiceLabel}预览失败`);
      return '';
    }
  };

  // 播放音色预览
  const playVoicePreview = async (gender: string, voiceLabel: string) => {
    setSelectedGender(gender);
    setSelectedVoice(voiceLabel);
    
    const key = `${gender}_${voiceLabel}`;
    let url = previewUrls[key];
    
    if (!url) {
      // 加载预览URL
      url = await loadVoicePreview(gender, voiceLabel);
      if (!url) return;
    }
    
    // 停止当前播放的音频
    if (currentPlayingAudio) {
      const audioElem = document.getElementById(currentPlayingAudio) as HTMLAudioElement;
      if (audioElem) {
        audioElem.pause();
        audioElem.currentTime = 0;
      }
    }
    
    // 播放新音频
    const audioElem = document.getElementById(key) as HTMLAudioElement;
    if (audioElem) {
      audioElem.play();
      setCurrentPlayingAudio(key);
    }
  };

  // 处理最终确认
  const handleFinalConfirmation = async () => {
    if (!selectedGender || !selectedVoice) {
      setError('请选择一个音色');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 调用API确认脚本
      const response = await ttsAPI.confirmScript(
        standardizedText,
        selectedGender,
        selectedVoice
      );
      
      // 通知父组件合成完成
      onSynthesisComplete(response.mp3_url);
      
      // 重置表单
      setStep(FormStep.SCRIPT_INPUT);
      setOriginalText('');
      setStandardizedText('');
      setStyleTags([]);
      setRecommendedVoices({});
      setSelectedGender('');
      setSelectedVoice('');
      setPreviewUrls({});
      setCurrentPlayingAudio('');
    } catch (err) {
      setError('语音合成失败，请重试');
      console.error('Final confirmation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 随机推荐更多音色
  const handleRefreshVoices = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 重新获取推荐音色
      const recommendResult = await ttsAPI.recommendVoices(styleTags);
      
      // 更新状态
      setRecommendedVoices(recommendResult.recommended_voices);
    } catch (err) {
      setError('刷新推荐音色失败，请重试');
      console.error('Voice refresh error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 渲染不同步骤的UI
  const renderStepContent = () => {
    switch (step) {
      case FormStep.SCRIPT_INPUT:
        return (
          <div className="script-input-step">
            <div className="form-group">
              <label>输入文本</label>
              <textarea
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                placeholder="请输入要合成的文本"
                disabled={isLoading}
                rows={8}
              />
            </div>
            <div className="button-group">
              <button
                onClick={handleTextInput}
                disabled={isLoading || !originalText.trim()}
                className="primary-button"
              >
                {isLoading ? '分析中...' : '分析文本'}
              </button>
            </div>
          </div>
        );
        
      case FormStep.SCRIPT_CONFIRMATION:
        return (
          <div className="script-confirmation-step">
            <div className="form-group">
              <label>标准化文本</label>
              <div className="standardized-text-display">
                {standardizedText}
              </div>
              <small className="help-text">我们已经对您的文本进行了标准化处理，请确认是否继续</small>
            </div>
            <div className="tag-container">
              <label>推荐标签:</label>
              <div className="tags">
                {styleTags.map((tag, index) => (
                  <span key={index} className="tag">{tag}</span>
                ))}
              </div>
            </div>
            <div className="button-group">
              <button
                onClick={() => handleScriptConfirmation(false)}
                disabled={isLoading}
                className="secondary-button"
              >
                返回修改
              </button>
              <button
                onClick={() => handleScriptConfirmation(true)}
                disabled={isLoading}
                className="primary-button"
              >
                {isLoading ? '处理中...' : '确认继续'}
              </button>
            </div>
          </div>
        );
        
      case FormStep.VOICE_SELECTION:
        return (
          <div className="voice-selection-step">
            <div className="form-group">
              <label>选择音色</label>
              <small className="help-text">点击音色卡片试听，选择您喜欢的音色</small>
            </div>
            
            {Object.entries(recommendedVoices).map(([gender, voices]) => (
              <div key={gender} className="voice-gender-section">
                <h3>{gender}</h3>
                <div className="voice-cards">
                  {voices.map((voice) => {
                    const key = `${gender}_${voice}`;
                    const isSelected = selectedGender === gender && selectedVoice === voice;
                    return (
                      <div 
                        key={key} 
                        className={`voice-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => playVoicePreview(gender, voice)}
                      >
                        <div className="voice-name">{voice}</div>
                        <audio id={key} src={previewUrls[key] || ''} />
                        <button className="play-button">
                          {currentPlayingAudio === key ? '播放中...' : '试听'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            <div className="button-group">
              <button
                onClick={() => setStep(FormStep.SCRIPT_CONFIRMATION)}
                disabled={isLoading}
                className="secondary-button"
              >
                返回
              </button>
              <button
                onClick={handleRefreshVoices}
                disabled={isLoading}
                className="secondary-button"
              >
                {isLoading ? '加载中...' : '换一批'}
              </button>
              <button
                onClick={handleFinalConfirmation}
                disabled={isLoading || !selectedGender || !selectedVoice}
                className="primary-button"
              >
                {isLoading ? '合成中...' : '确认使用'}
              </button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  // 预加载音色预览
  useEffect(() => {
    if (step === FormStep.VOICE_SELECTION) {
      // 预加载所有推荐音色的预览
      Object.entries(recommendedVoices).forEach(([gender, voices]) => {
        voices.forEach(voice => {
          loadVoicePreview(gender, voice);
        });
      });
    }
  }, [step, recommendedVoices]);

  return (
    <div className="smart-tts-form">
      <div className="step-indicator">
        <div className={`step ${step === FormStep.SCRIPT_INPUT ? 'active' : ''}`}>1. 输入文本</div>
        <div className={`step ${step === FormStep.SCRIPT_CONFIRMATION ? 'active' : ''}`}>2. 确认文本</div>
        <div className={`step ${step === FormStep.VOICE_SELECTION ? 'active' : ''}`}>3. 选择音色</div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {renderStepContent()}
    </div>
  );
};

export default SmartTTSForm; 
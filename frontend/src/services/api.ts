import axios from 'axios';

// API基础URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false // 关闭跨域请求携带凭证，避免某些CORS问题
});

// 请求拦截器，添加身份验证
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// 响应接口类型
export interface AudioPreview {
  preview_id: string;
  audio_url: string;
  accent: string;
  voice_style: string;
}

export interface ScriptResponse {
  english_script: string;
  chinese_translation: string;
}

export interface FinalAudioResponse {
  audio_url: string;
  download_url: string;
}

// 用户接口
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterResponse {
  token: string;
  user: User;
}

// 消息接口
export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// API函数
export const apiService = {
  // 获取音频预览
  getAudioPreviews: async (text: string, accent: string, voiceStyle?: string) => {
    try {
      const response = await api.post<AudioPreview[]>('/audio-previews', {
        text,
        accent,
        voice_style: voiceStyle
      });
      return response.data;
    } catch (error) {
      console.error('获取音频预览失败:', error);
      throw error;
    }
  },

  // 生成配音脚本
  generateScript: async (prompt: string) => {
    try {
      const response = await api.post<ScriptResponse>('/generate-script', {
        prompt
      });
      return response.data;
    } catch (error) {
      console.error('生成配音脚本失败:', error);
      throw error;
    }
  },

  // 生成最终音频
  generateFinalAudio: async (text: string, accent: string, voiceStyle?: string) => {
    try {
      const response = await api.post<FinalAudioResponse>('/final-audio', {
        text,
        accent,
        voice_style: voiceStyle
      });
      return response.data;
    } catch (error) {
      console.error('生成最终音频失败:', error);
      throw error;
    }
  }
};

// 聊天API
export const chatAPI = {
  // 发送聊天消息到魔声AI语音助手
  sendMessage: async (messages: Message[], temperature: number = 0.7, maxTokens: number = 2000) => {
    try {
      console.log('发送聊天请求到后端，消息数量:', messages.length);
      
      // 对消息进行预处理，确保格式符合后端期望
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      const response = await api.post('/chat/chat', {
        messages: formattedMessages,
        temperature,
        max_tokens: maxTokens
      });
      
      console.log('聊天响应:', response.data);
      
      // 处理返回的消息
      if (response.data && response.data.message) {
        return {
          message: response.data.message,
          messages: response.data.messages || [...messages, response.data.message]
        };
      } else {
        throw new Error('响应格式不正确');
      }
    } catch (error) {
      console.error('聊天API错误:', error);
      // 失败时返回一个错误消息，以确保前端不会崩溃
      const errorMessage: Message = {
        role: 'assistant',
        content: '很抱歉，我暂时无法回应您的请求。请稍后再试或联系客服。'
      };
      return {
        message: errorMessage,
        messages: [...messages, errorMessage]
      };
    }
  }
};

// 语音合成API
export const ttsAPI = {
  // 合成语音
  synthesize: async (text: string, userId?: string, sessionId?: string) => {
    try {
      // 使用FormData而不是JSON，因为后端接收Form参数
      const formData = new FormData();
      formData.append('text', text);
      formData.append('voice_type', '默认');
      
      const response = await api.post('/synthesize', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',  // 明确请求JSON响应
        },
      });
      return response.data;
    } catch (error) {
      console.error('语音合成失败:', error);
      throw error;
    }
  },
  
  // 确认脚本并生成最终音频
  confirmScript: async (text: string, userId?: string, sessionId?: string) => {
    try {
      const response = await api.post('/confirm_script', { 
        text, 
        user_id: userId,
        session_id: sessionId
      });
      return response.data;
    } catch (error) {
      console.error('确认脚本失败:', error);
      throw error;
    }
  },
  
  // 获取已保存的音频列表
  getSavedAudios: async () => {
    try {
      const response = await api.get('/tts/saved_audios');
      return response.data;
    } catch (error) {
      console.error('获取已保存音频失败:', error);
      throw error;
    }
  }
};

// 验证API
export const authAPI = {
  // 谷歌登录
  googleLogin: async (token: string) => {
    try {
      const response = await api.post('/auth/google', { token });
      return response.data;
    } catch (error) {
      console.error('谷歌登录失败:', error);
      throw error;
    }
  },
  
  // 获取当前用户信息
  getCurrentUser: async () => {
    try {
      // 尝试从本地存储获取用户信息
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        return JSON.parse(savedUser);
      }
      
      // 如果本地没有，则尝试从API获取
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      // 返回null而不是抛出错误，避免页面崩溃
      return null;
    }
  },
  
  // 登出
  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch (error) {
      console.error('登出失败:', error);
      throw error;
    }
  }
};

export default api; 
import axios from 'axios';

// API基础URL
// 优先使用环境变量中的API基础URL，如果没有则使用默认值
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
console.log('当前API基础URL:', API_BASE_URL);

// 创建一个axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // 增加超时时间
  timeout: 90000,
});

// 添加请求拦截器
api.interceptors.request.use(
  (config) => {
    // 获取token并添加到请求头
    const token = localStorage.getItem('authToken');
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    console.log('请求发送:', config.url, config.data);
    return config;
  },
  (error) => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

// 添加响应拦截器
api.interceptors.response.use(
  (response) => {
    console.log('响应接收:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('响应错误:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

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
  role: 'system' | 'user' | 'assistant';
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

// 认证API
export const authAPI = {
  // 用户登录
  login: async (email: string, password: string) => {
    try {
      const response = await api.post<LoginResponse>('/auth/login', {
        email,
        password
      });
      // 保存token到本地存储
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  },

  // 用户注册
  register: async (username: string, email: string, password: string) => {
    try {
      const response = await api.post<RegisterResponse>('/auth/register', {
        username,
        email,
        password
      });
      // 保存token到本地存储
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('注册失败:', error);
      throw error;
    }
  },

  // 退出登录
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  // 获取当前用户信息
  getCurrentUser: () => {
    const userString = localStorage.getItem('user');
    if (userString) {
      return JSON.parse(userString) as User;
    }
    return null;
  },

  // 检查是否已登录
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },

  // 社交登录 - 微信
  wechatLogin: async (code: string) => {
    try {
      const response = await api.post<LoginResponse>('/auth/wechat-login', { code });
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('微信登录失败:', error);
      throw error;
    }
  },

  // 社交登录 - Google
  googleLogin: async (code: string) => {
    try {
      console.log('发送Google登录请求，code:', code);
      // 直接使用完整URL，不依赖baseURL
      const response = await axios.post('http://localhost:8000/api/auth/google-login', { code }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      console.log('Google登录响应:', response.data);
      
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('Google登录失败:', error);
      throw error;
    }
  }
};

// 聊天API
export const chatAPI = {
  // 发送聊天消息到DeepSeek AI
  sendMessage: async (messages: Message[], temperature: number = 0.7, maxTokens: number = 2000) => {
    try {
      const response = await api.post('/chat/chat', {
        messages,
        temperature,
        max_tokens: maxTokens
      });
      return response.data;
    } catch (error) {
      console.error('聊天API错误:', error);
      throw error;
    }
  },
  
  // 根据文本推荐音色
  recommendVoiceStyles: async (text: string, count: number = 3) => {
    try {
      const response = await api.post('/chat/recommend_voice_styles', {
        text,
        count
      });
      return response.data;
    } catch (error) {
      console.error('推荐音色错误:', error);
      throw error;
    }
  }
};

// 语音API
export const voiceAPI = {
  // 生成配音
  generateVoice: async (text: string, accent: string, style: string) => {
    try {
      const response = await api.post('/voice/generate', {
        text,
        accent,
        style
      });
      return response.data;
    } catch (error) {
      console.error('语音API错误:', error);
      throw error;
    }
  },
  
  // 获取音频预览
  getAudioPreviews: async (text: string) => {
    try {
      const response = await api.post('/voice/previews', {
        text
      });
      return response.data;
    } catch (error) {
      console.error('获取音频预览错误:', error);
      throw error;
    }
  }
};

// 定义接口
export interface VoiceTypes {
  [gender: string]: string[];
}

export interface TTSResponse {
  success: boolean;
  message: string;
  wav_url: string;
  mp3_url: string;
  text: string;
}

export interface ConfirmScriptResponse {
  success: boolean;
  message: string;
  audio_id: string;
  wav_url: string;
  mp3_url: string;
  text: string;
  timestamp: string;
}

// 定义 TTS 服务的 Base URL
const TTS_API_BASE_URL = 'http://localhost:8080'; // TTS 服务运行在 8080 端口

// API服务 - 修改 ttsAPI
export const ttsAPI = {
  // 获取可用的声音类型 - 这个可能也需要访问 8080 端口？假设它也在 TTS 服务上
  getVoiceTypes: async (): Promise<VoiceTypes> => {
    try {
      // 直接调用 8080 端口
      const response = await axios.get(`${TTS_API_BASE_URL}/voice_types`);
      // 注意：返回的数据结构可能需要调整，假设 voice_types 在顶层
      return response.data.voice_types || response.data; 
    } catch (error) {
      console.error('获取声音类型失败:', error);
      throw error;
    }
  },

  // 合成语音
  synthesize: async (text: string, gender: string, voiceLabel: string): Promise<TTSResponse> => {
    try {
      const formData = new FormData();
      formData.append('text', text);
      formData.append('gender', gender);
      formData.append('voice_label', voiceLabel);

      // 直接调用 8080 端口的 /synthesize
      const response = await axios.post(`${TTS_API_BASE_URL}/synthesize`, formData, {
        headers: {
          // Content-Type 由浏览器根据 FormData 自动设置，通常不需要手动指定
          // 'Content-Type': 'multipart/form-data',
          'Accept': 'application/json' // 确保我们期望得到 JSON 响应
        }
      });
      return response.data;
    } catch (error) {
      console.error('语音合成失败:', error);
      throw error;
    }
  },

  // 确认脚本
  confirmScript: async (
    text: string,
    gender: string,
    voiceLabel: string,
    userId?: string,
    sessionId?: string
  ): Promise<ConfirmScriptResponse> => {
    try {
      // 直接调用 8080 端口的 /confirm_script
      const response = await axios.post(`${TTS_API_BASE_URL}/confirm_script`, {
        text,
        gender,
        voice_label: voiceLabel,
        user_id: userId,
        session_id: sessionId
      }, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('确认脚本失败:', error);
      throw error;
    }
  }
};

export default api; 
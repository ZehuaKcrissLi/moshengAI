import axios from 'axios';

// API基础URL
const API_BASE_URL = 'http://localhost:8000/api';

// 创建一个axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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

export default api; 
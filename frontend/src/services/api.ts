import axios from 'axios';

// API基础URL
// 优先使用环境变量中的API基础URL，如果没有则使用相对路径
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
console.log('当前API基础URL:', API_BASE_URL);

// 定义用于获取TTS预览音频的URL（使用同源）
export const API_BASE_URL_FOR_PREVIEW = '';

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
      // 使用相对路径
      const response = await axios.post('/api/auth/google-login', { code }, {
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
      console.log('使用fetch API直接发送请求，绕过axios');
      // 直接使用fetch API代替axios，避免潜在的DNS解析问题
      const response = await fetch('/api/chat/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          messages,
          temperature,
          max_tokens: maxTokens
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP错误! 状态: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('聊天API错误:', error);
      throw error;
    }
  },
  
  // 根据文本推荐音色
  recommendVoiceStyles: async (text: string, count: number = 3) => {
    try {
      console.log('使用fetch API发送推荐音色请求');
      // 使用fetch API代替axios
      const response = await fetch('/api/chat/recommend_voice_styles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          text,
          count
        })
      });
      
      if (!response.ok) {
        throw new Error(`推荐音色HTTP错误! 状态: ${response.status}`);
      }
      
      return await response.json();
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
// const TTS_API_BASE_URL = 'http://localhost:8080'; // TTS 服务运行在 8080 端口
const TTS_API_BASE_URL = import.meta.env.VITE_TTS_BASE_URL || '/tts';
console.log('当前TTS API基础URL:', TTS_API_BASE_URL);

// API服务 - 修改 ttsAPI
export const ttsAPI = {
  // 获取可用的声音类型
  getVoiceTypes: async (): Promise<VoiceTypes> => {
    try {
      console.log('使用fetch API获取声音类型');
      
      const response = await fetch(`${TTS_API_BASE_URL}/voice_types`);
      
      if (!response.ok) {
        throw new Error(`获取声音类型失败: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.voice_types || data;
    } catch (error) {
      console.error('获取声音类型失败:', error);
      throw error;
    }
  },

  // 合成语音 - 异步接口，内部自动轮询直到任务完成，返回绝对 URL
  synthesize: async (text: string, gender: string, voiceLabel: string): Promise<TTSResponse> => {
    try {
      // 使用FormData
      const formData = new FormData();
      formData.append('text', text);
      formData.append('gender', gender);
      formData.append('voice_label', voiceLabel);

      console.log('使用fetch API发送语音合成请求');
      
      // 1. 发送合成请求 - 使用fetch代替axios
      const initialResp = await fetch(`${TTS_API_BASE_URL}/synthesize`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (initialResp.status !== 202) {
        throw new Error(`请求被拒绝: ${initialResp.statusText}`);
      }

      const data = await initialResp.json();
      const { task_id, status_url } = data;
      
      if (!task_id || !status_url) {
        throw new Error('服务器未返回 task_id 或 status_url');
      }

      // 2. 轮询任务状态
      const poll = async (): Promise<TTSResponse> => {
        console.log('轮询任务状态，status_url:', status_url);
        
        // 确保status_url是相对路径，如果是完整URL则提取路径部分
        let pollUrl = status_url;
        if (pollUrl.startsWith('http')) {
          try {
            const url = new URL(pollUrl);
            pollUrl = url.pathname + url.search;
          } catch (e) {
            console.error('解析status_url失败:', e);
          }
        }
        
        // 如果status_url已经包含完整路径，则不需要添加TTS_API_BASE_URL
        const finalUrl = pollUrl.startsWith('/') ? pollUrl : `${TTS_API_BASE_URL}/${pollUrl}`;
        console.log('最终轮询URL:', finalUrl);
        
        const resp = await fetch(finalUrl);
        if (!resp.ok) {
          throw new Error(`轮询状态错误: ${resp.status} ${resp.statusText}`);
        }
        
        const data = await resp.json();
        
        if (data.status === 'completed' && data.result) {
          // 处理音频URL
          let wavUrl = '';
          let mp3Url = '';
          
          // 处理wav_url
          if (data.result.wav_url) {
            if (data.result.wav_url.startsWith('http')) {
              // 如果是完整URL
              if (data.result.wav_url.includes('cloudflare')) {
                // Cloudflare域名URL: 使用相对路径，去掉域名部分
                try {
                  const url = new URL(data.result.wav_url);
                  wavUrl = `${TTS_API_BASE_URL}${url.pathname}${url.search}`;
                  console.log('处理Cloudflare URL (wav):', data.result.wav_url, '→', wavUrl);
                } catch (e) {
                  console.error('解析Cloudflare URL失败 (wav):', e);
                  wavUrl = data.result.wav_url;
                }
              } else {
                wavUrl = data.result.wav_url; // 如果是其他完整URL则直接使用
              }
            } else {
              // 如果是相对路径，构建正确的URL
              const path = data.result.wav_url.startsWith('/') ? data.result.wav_url : `/${data.result.wav_url}`;
              wavUrl = `${TTS_API_BASE_URL}${path}`;
            }
          }
          
          // 处理mp3_url
          if (data.result.mp3_url) {
            if (data.result.mp3_url.startsWith('http')) {
              // 如果是完整URL
              if (data.result.mp3_url.includes('cloudflare')) {
                // Cloudflare域名URL: 使用相对路径，去掉域名部分
                try {
                  const url = new URL(data.result.mp3_url);
                  mp3Url = `${TTS_API_BASE_URL}${url.pathname}${url.search}`;
                  console.log('处理Cloudflare URL (mp3):', data.result.mp3_url, '→', mp3Url);
                } catch (e) {
                  console.error('解析Cloudflare URL失败 (mp3):', e);
                  mp3Url = data.result.mp3_url;
                }
              } else {
                mp3Url = data.result.mp3_url; // 如果是其他完整URL则直接使用
              }
            } else {
              // 如果是相对路径，构建正确的URL
              const path = data.result.mp3_url.startsWith('/') ? data.result.mp3_url : `/${data.result.mp3_url}`;
              mp3Url = `${TTS_API_BASE_URL}${path}`;
            }
          }
          
          const abs = {
            ...data.result,
            wav_url: wavUrl,
            mp3_url: mp3Url
          } as TTSResponse;
          return abs;
        }
        
        if (data.status === 'failed') {
          throw new Error(data.error || '语音合成任务失败');
        }
        
        // pending 或 processing，等待后重试
        await new Promise((res) => setTimeout(res, 2000));
        return poll();
      };

      return await poll();
    } catch (error) {
      console.error('语音合成失败:', error);
      throw error;
    }
  },

  // 确认脚本 - 返回绝对 URL
  confirmScript: async (
    text: string,
    gender: string,
    voiceLabel: string,
    userId?: string,
    sessionId?: string
  ): Promise<ConfirmScriptResponse> => {
    try {
      console.log('使用fetch API发送确认脚本请求');
      
      // 使用fetch代替axios
      const response = await fetch(`${TTS_API_BASE_URL}/confirm_script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          text,
          gender,
          voice_label: voiceLabel,
          user_id: userId,
          session_id: sessionId
        })
      });
      
      if (!response.ok) {
        throw new Error(`确认脚本请求失败: ${response.status} ${response.statusText}`);
      }
      
      // 解析响应
      const responseData = await response.json();
      
      // 处理音频URL
      let wavUrl = '';
      let mp3Url = '';
      
      // 处理wav_url
      if (responseData.wav_url) {
        if (responseData.wav_url.startsWith('http')) {
          // 如果是完整URL
          if (responseData.wav_url.includes('cloudflare')) {
            // Cloudflare域名URL: 使用相对路径，去掉域名部分
            try {
              const url = new URL(responseData.wav_url);
              wavUrl = `${TTS_API_BASE_URL}${url.pathname}${url.search}`;
              console.log('处理Cloudflare URL (wav):', responseData.wav_url, '→', wavUrl);
            } catch (e) {
              console.error('解析Cloudflare URL失败 (wav):', e);
              wavUrl = responseData.wav_url;
            }
          } else {
            wavUrl = responseData.wav_url; // 如果是其他完整URL则直接使用
          }
        } else {
          // 如果是相对路径，构建正确的URL
          const path = responseData.wav_url.startsWith('/') ? responseData.wav_url : `/${responseData.wav_url}`;
          wavUrl = `${TTS_API_BASE_URL}${path}`;
        }
      }
      
      // 处理mp3_url
      if (responseData.mp3_url) {
        if (responseData.mp3_url.startsWith('http')) {
          // 如果是完整URL
          if (responseData.mp3_url.includes('cloudflare')) {
            // Cloudflare域名URL: 使用相对路径，去掉域名部分
            try {
              const url = new URL(responseData.mp3_url);
              mp3Url = `${TTS_API_BASE_URL}${url.pathname}${url.search}`;
              console.log('处理Cloudflare URL (mp3):', responseData.mp3_url, '→', mp3Url);
            } catch (e) {
              console.error('解析Cloudflare URL失败 (mp3):', e);
              mp3Url = responseData.mp3_url;
            }
          } else {
            mp3Url = responseData.mp3_url; // 如果是其他完整URL则直接使用
          }
        } else {
          // 如果是相对路径，构建正确的URL
          const path = responseData.mp3_url.startsWith('/') ? responseData.mp3_url : `/${responseData.mp3_url}`;
          mp3Url = `${TTS_API_BASE_URL}${path}`;
        }
      }
      
      // Prepend TTS base URL to relative paths
      const absoluteData = {
        ...responseData,
        wav_url: wavUrl,
        mp3_url: mp3Url
      };
      
      return absoluteData;
    } catch (error) {
      console.error('确认脚本失败:', error);
      throw error;
    }
  }
};

export default api; 
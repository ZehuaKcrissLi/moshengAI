import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    cors: true,
    hmr: {
      protocol: 'wss',
      host: 'moshengai.kcriss.dev',
      clientPort: 443,
      path: '/hmr/',
      timeout: 120000
    },
    fs: {
      strict: true,
      allow: [
        __dirname,
        fileURLToPath(new URL('.env', import.meta.url))
      ]
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/tts': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tts/, '')
      },
      '/prompt_voice': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/assets': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  build: {
    sourcemap: true,
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
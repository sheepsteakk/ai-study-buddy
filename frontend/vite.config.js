import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

const BACKEND = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export default defineConfig({
  base: '/ai-study-buddy/',          // <<< IMPORTANT for GitHub Pages subpath
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@api': path.resolve(__dirname, './src/api'),
    },
  },
  // dev-only proxy (safe to leave as-is)
  server: {
    port: 5173,
    proxy: { '/api/v1': { target: BACKEND, changeOrigin: true, secure: false } },
  },
})

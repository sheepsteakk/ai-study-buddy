import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

const BACKEND = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

// one timestamp per build – forces new filenames on every deploy
const buildTimestamp = Date.now()

export default defineConfig({
  base: '/ai-study-buddy/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@api': path.resolve(__dirname, './src/api'),
    },
  },

  // dev server (npm run dev) – unchanged
  server: {
    port: 5173,
    proxy: {
      '/api/v1': {
        target: BACKEND,
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // build for GitHub Pages
  build: {
    outDir: 'docs',         // this is what your GH Actions workflow deploys
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // force new filenames so browsers never reuse stale JS/CSS
        entryFileNames: `assets/[name].${buildTimestamp}.js`,
        chunkFileNames: `assets/[name].${buildTimestamp}.js`,
        assetFileNames: `assets/[name].${buildTimestamp}.[ext]`,
      },
    },
  },
})

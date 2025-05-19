import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://accelera-crm-production.up.railway.app',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path
      },
    },
  },
})
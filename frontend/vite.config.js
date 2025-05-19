import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// This matches the Railway CRM_BASE_URL exactly
const TARGET_URL = 'https://accelera-crm-production.up.railway.app/';

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
        target: TARGET_URL,
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('Proxy Error:', err);
            console.error('Request URL:', req.url);
            console.error('Request Headers:', req.headers);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request:', {
              method: req.method,
              url: req.url,
              targetUrl: TARGET_URL + req.url,
              headers: proxyReq.getHeaders()
            });
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response:', {
              statusCode: proxyRes.statusCode,
              headers: proxyRes.headers,
              url: req.url
            });
          });
        }
      },
    },
  },
})
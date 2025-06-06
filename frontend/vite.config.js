import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// URLs for different environments
const PRODUCTION_BACKEND = 'https://accelera-crm-production.up.railway.app';
const PRODUCTION_FRONTEND = 'https://accelera.creditplan.it';
const LOCAL_BACKEND = 'http://localhost:3000';

// Determine target URL based on environment
const TARGET_URL = process.env.NODE_ENV === 'production' 
  ? PRODUCTION_BACKEND
  : LOCAL_BACKEND;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173, // Frontend port
    // Add historyApiFallback for client-side routing
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: TARGET_URL,
        changeOrigin: true,
        secure: process.env.NODE_ENV === 'production', // Only use secure in production
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
    // Add CORS configuration
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? [PRODUCTION_FRONTEND]
        : ['http://localhost:5173', 'http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      credentials: true
    }
  },
  // Add base URL configuration
  base: '/',
  // Improve build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Generate sourcemaps for better debugging
    sourcemap: true,
    // Improve chunking strategy
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
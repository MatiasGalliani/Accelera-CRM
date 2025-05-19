const isDevelopment = import.meta.env.DEV;

// In development, use the proxy configured in vite.config.js
// In production, use the full URL
export const API_BASE_URL = isDevelopment 
  ? '' // Empty string uses the proxy in development
  : 'https://accelera-crm-production.up.railway.app';

// Helper function to build API URLs
export const getApiUrl = (path) => {
  return `${API_BASE_URL}${path}`;
};

// API Endpoints
export const API_ENDPOINTS = {
    CHECK_USER_ROLE: '/api/check-user-role',
    CREATE_ADMIN: '/api/create-admin',
    AGENTS: '/api/agents',
    FIREBASE_USERS: '/api/firebase-users',
    LEADS: '/api/leads',
    WEBHOOKS: '/api/leads/webhook',
};

// Firebase Admin Emails - all lowercase for consistent comparison
export const ADMIN_EMAILS = [
    'admin@creditplan.it',
    'it@creditplan.it',
].map(email => email.toLowerCase()); // Ensure all emails are lowercase

const isDevelopment = import.meta.env.DEV;

export const API_BASE_URL = isDevelopment 
  ? '' // Empty string uses the proxy in development
  : 'https://accelera-crm-production.up.railway.app';

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

// Firebase Admin Emails (if needed)
export const ADMIN_EMAILS = [
    'admin@creditplan.it',
    // Add other admin emails here
];

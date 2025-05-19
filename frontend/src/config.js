const isDevelopment = import.meta.env.DEV;

// In development, use the proxy configured in vite.config.js
// In production, use the full URL (removing any trailing slash)
export const API_BASE_URL = isDevelopment 
  ? '' // Empty string uses the proxy in development
  : 'https://accelera-crm-production.up.railway.app'.replace(/\/$/, '');

// Helper function to build API URLs
export const getApiUrl = (path) => {
  const base = API_BASE_URL || '';
  // Ensure path starts with / and there's no double slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  // Ensure base URL doesn't end with a slash
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${cleanBase}${cleanPath}`;
};

// API Endpoints (ensure they don't start with /)
export const API_ENDPOINTS = {
    CHECK_USER_ROLE: 'api/check-user-role',
    CREATE_ADMIN: 'api/create-admin',
    AGENTS: 'api/agents',
    FIREBASE_USERS: 'api/firebase-users',
    LEADS: 'api/leads',
    WEBHOOKS: 'api/leads/webhook',
};

// Firebase Admin Emails - all lowercase for consistent comparison
export const ADMIN_EMAILS = [
    'admin@creditplan.it',
    'it@creditplan.it',
].map(email => email.toLowerCase()); // Ensure all emails are lowercase

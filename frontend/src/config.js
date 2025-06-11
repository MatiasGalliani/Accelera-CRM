const isDevelopment = import.meta.env.DEV;

// In development, use the proxy configured in vite.config.js
// In production, use the full URL (removing any trailing slash)
export const API_BASE_URL = isDevelopment 
  ? '' // Empty string uses the proxy in development
  : 'http://accelera-crm-production.up.railway.app'.replace(/\/$/, '');

// Helper function to build API URLs
export const getApiUrl = (path) => {
  // Remove any leading slash from path
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  if (isDevelopment) {
    // In development, just prepend / to ensure proxy works
    return `/${cleanPath}`;
  } else {
    // In production, ensure proper URL formatting
    return `${API_BASE_URL}/${cleanPath}`;
  }
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

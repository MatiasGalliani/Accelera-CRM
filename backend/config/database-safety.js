// Database safety configuration and checks
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const shouldRunMigrations = isDevelopment || process.env.FORCE_MIGRATIONS === 'true';
export const shouldAlterSchema = isDevelopment && process.env.ALLOW_SCHEMA_ALTER === 'true';

// Helper function to safely execute database operations
export const safeDbOperation = async (operation, fallback = null) => {
  if (isProduction && !process.env.FORCE_DB_OPERATIONS) {
    console.log('Skipping database operation in production environment');
    return fallback;
  }
  return operation();
};

// Helper to check if maintenance operations are allowed
export const canRunMaintenance = () => {
  if (isProduction) {
    console.warn('Maintenance operations are disabled in production');
    return false;
  }
  return true;
}; 
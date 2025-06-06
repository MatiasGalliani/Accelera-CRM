import sequelize from './config/database.js';
import createTables from './migrations/create-permissions-tables.js';
import { shouldRunMigrations, shouldAlterSchema, safeDbOperation } from './config/database-safety.js';

async function initializeDatabase() {
  try {
    console.log('Starting database initialization...');
    
    // Only sync models if we're allowed to alter schema
    if (shouldAlterSchema) {
      console.log('Development mode: Syncing database models with alter option');
      await sequelize.sync({ alter: true });
      console.log('Database models synchronized');
    } else {
      console.log('Production mode: Skipping schema alterations');
      // Just verify the connection
      await sequelize.authenticate();
    }
    
    // Run migrations only if allowed
    if (shouldRunMigrations) {
      console.log('Running database migrations...');
      await createTables();
      console.log('Migrations completed');
    } else {
      console.log('Skipping migrations in production');
    }
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error during database initialization:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1); // Exit in production on error
    }
  } finally {
    await sequelize.close();
  }
}

// Run if this file is called directly
if (process.argv[1] === import.meta.url) {
  initializeDatabase()
    .then(() => {
      console.log('Database initialization process completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error in database initialization process:', error);
      process.exit(1);
    });
}

export default initializeDatabase; 
import sequelize from './config/database.js';
import createTables from './migrations/create-permissions-tables.js';

async function initializeDatabase() {
  try {
    console.log('Starting database initialization...');
    
    // Sync all models with the database
    await sequelize.sync({ alter: true });
    console.log('Database models synchronized');
    
    // Run the permissions tables creation
    await createTables();
    console.log('Permissions tables created');
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error during database initialization:', error);
    process.exit(1);
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
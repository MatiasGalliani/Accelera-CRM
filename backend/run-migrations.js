import { Sequelize } from 'sequelize';
import * as url from 'url';
import * as path from 'path';
import * as fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get database connection string from environment variables
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL not set in environment variables');
  process.exit(1);
}

// Create Sequelize instance
const sequelize = new Sequelize(databaseUrl, {
  logging: console.log
});

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const migrationsPath = path.join(__dirname, 'migrations');

async function runMigrations() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Get all migration files
    const files = fs.readdirSync(migrationsPath)
      .filter(file => file.endsWith('.js'))
      .sort();
    
    console.log(`Found ${files.length} migration files`);
    
    // Run each migration in order
    for (const file of files) {
      console.log(`Running migration: ${file}`);
      const migrationPath = path.join(migrationsPath, file);
      const migration = await import(url.pathToFileURL(migrationPath).href);
      
      // Run up function
      if (typeof migration.up === 'function') {
        await migration.up(sequelize.getQueryInterface(), Sequelize);
        console.log(`Migration ${file} applied successfully`);
      } else {
        console.warn(`Migration ${file} has no up function, skipping`);
      }
    }
    
    console.log('All migrations have been applied successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigrations(); 
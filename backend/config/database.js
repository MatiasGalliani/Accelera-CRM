import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { isProduction } from './database-safety.js';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'case_management',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: isProduction ? false : console.log, // Only log in development
    pool: {
      max: isProduction ? 5 : 2, // More connections in production
      min: 0,
      acquire: 60000,
      idle: 10000
    },
    dialectOptions: {
      connectTimeout: 60000,
      // Add SSL configuration for production
      ...(isProduction && {
        ssl: {
          require: true,
          rejectUnauthorized: false // Set to true if you have valid SSL cert
        }
      })
    },
    retry: {
      max: isProduction ? 5 : 3 // More retries in production
    }
  }
);

// Test the connection
sequelize.authenticate()
  .then(() => {
    console.log(`Database connection established successfully in ${process.env.NODE_ENV || 'development'} mode.`);
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
    if (isProduction) {
      // In production, we might want to exit if we can't connect to the database
      process.exit(1);
    }
  });

export default sequelize;
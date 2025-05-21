import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get database configuration from environment variables or use defaults
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_NAME = process.env.DB_NAME || 'leaddb';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'password';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_DIALECT = process.env.DB_DIALECT || 'postgres';

// Create a mock implementation for development and testing when DB is not available
class MockSequelize {
  constructor() {
    this.options = {};
    this.models = {};
    console.warn('Using mock database implementation. Data will not be persisted.');
  }
  
  define(modelName, attributes, options) {
    this.models[modelName] = { name: modelName, attributes, options };
    return this.models[modelName];
  }
  
  async sync() {
    console.log('Mock sync performed - no actual database changes');
    return true;
  }
  
  async authenticate() {
    console.log('Mock authentication performed');
    return true;
  }
  
  async transaction(callback) {
    if (typeof callback === 'function') {
      return await callback({ commit: () => {}, rollback: () => {} });
    }
    return { 
      commit: () => {}, 
      rollback: () => {} 
    };
  }
}

// Try to create real Sequelize instance, fall back to mock if it fails
let sequelize;

try {
  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: DB_DIALECT,
    logging: false, // Set to console.log to see SQL queries
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
  
  // Test the connection (but don't fail if it doesn't work)
  sequelize.authenticate()
    .then(() => {
      console.log('Database connection has been established successfully.');
    })
    .catch(err => {
      console.error('Warning: Unable to connect to the database:', err);
      console.log('Falling back to mock database implementation');
      sequelize = new MockSequelize();
    });
} catch (error) {
  console.error('Error creating Sequelize instance:', error);
  console.log('Falling back to mock database implementation');
  sequelize = new MockSequelize();
}

export default sequelize;
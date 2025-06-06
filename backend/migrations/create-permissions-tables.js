import sequelize from '../config/database.js';
import { DataTypes } from 'sequelize';
import { shouldRunMigrations, safeDbOperation } from '../config/database-safety.js';

async function createTables() {
  // Skip if we shouldn't run migrations
  if (!shouldRunMigrations) {
    console.log('Skipping table creation in production environment');
    return;
  }

  try {
    console.log('Starting creation of permission and lead tables...');

    // Wrap each table creation in safeDbOperation
    await safeDbOperation(async () => {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS agent_pages (
          id SERIAL PRIMARY KEY,
          agent_id INTEGER NOT NULL,
          page_route VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
          UNIQUE (agent_id, page_route)
        );
      `);
      console.log('Table agent_pages created or already exists');
    });

    await safeDbOperation(async () => {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS agent_lead_sources (
          id SERIAL PRIMARY KEY,
          agent_id INTEGER NOT NULL,
          source VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
          UNIQUE (agent_id, source)
        );
      `);
      console.log('Table agent_lead_sources created or already exists');
    });

    await safeDbOperation(async () => {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS leads (
          id SERIAL PRIMARY KEY,
          source VARCHAR(50) NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(50),
          message TEXT,
          status VARCHAR(50) DEFAULT 'new',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          assigned_agent_id INTEGER,
          FOREIGN KEY (assigned_agent_id) REFERENCES agents(id)
        );
      `);
      console.log('Table leads created or already exists');
    });

    await safeDbOperation(async () => {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS lead_details (
          id SERIAL PRIMARY KEY,
          lead_id INTEGER NOT NULL,
          requested_amount DECIMAL,
          net_salary DECIMAL,
          employee_type VARCHAR(50),
          contract_type VARCHAR(50),
          employment_subtype VARCHAR(50),
          employment_date VARCHAR(7),
          num_employees INTEGER,
          birth_date DATE,
          residence_province VARCHAR(50),
          residence_city VARCHAR(100),
          financing_purpose TEXT,
          company_name VARCHAR(100),
          legal_city VARCHAR(100),
          operational_city VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
        );
      `);
      console.log('Table lead_details created or already exists');
    });

    await safeDbOperation(async () => {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS lead_notes (
          id SERIAL PRIMARY KEY,
          lead_id INTEGER NOT NULL,
          agent_id INTEGER NOT NULL,
          note TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
          FOREIGN KEY (agent_id) REFERENCES agents(id)
        );
      `);
      console.log('Table lead_notes created or already exists');
    });

    await safeDbOperation(async () => {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS lead_status_history (
          id SERIAL PRIMARY KEY,
          lead_id INTEGER NOT NULL,
          agent_id INTEGER NOT NULL,
          old_status VARCHAR(50),
          new_status VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
          FOREIGN KEY (agent_id) REFERENCES agents(id)
        );
      `);
      console.log('Table lead_status_history created or already exists');
    });

    console.log('All tables have been created successfully');

  } catch (error) {
    console.error('Error creating tables:', error);
    if (process.env.NODE_ENV === 'production') {
      throw error; // Re-throw in production to trigger proper error handling
    }
  } finally {
    await sequelize.close();
  }
}

// Only run if this file is called directly and we're allowed to run migrations
if (process.argv[1] === import.meta.url && shouldRunMigrations) {
  createTables()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error in migration process:', error);
      process.exit(1);
    });
}

export default createTables; 
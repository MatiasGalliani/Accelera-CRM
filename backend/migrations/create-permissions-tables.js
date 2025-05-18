import sequelize from '../config/database.js';
import { DataTypes } from 'sequelize';

async function createTables() {
  try {
    console.log('Iniciando creación de tablas para sistema de permisos y leads...');

    // Creamos la tabla agents_pages (para rutas en la aplicación)
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
    console.log('Tabla agent_pages creada o ya existente');

    // Creamos la tabla agent_lead_sources (fuentes de leads permitidas)
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
    console.log('Tabla agent_lead_sources creada o ya existente');

    // Creamos la tabla leads
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
    console.log('Tabla leads creada o ya existente');

    // Creamos la tabla lead_details (detalles específicos según la fuente)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS lead_details (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER NOT NULL,
        requested_amount DECIMAL,
        net_salary DECIMAL,
        employee_type VARCHAR(50),
        contract_type VARCHAR(50),
        employment_subtype VARCHAR(50),
        birth_date DATE,
        residence_province VARCHAR(50),
        financing_purpose TEXT,
        company_name VARCHAR(100),
        legal_city VARCHAR(100),
        operational_city VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
      );
    `);
    console.log('Tabla lead_details creada o ya existente');

    // Creamos la tabla lead_notes (comentarios sobre los leads)
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
    console.log('Tabla lead_notes creada o ya existente');

    // Creamos la tabla lead_status_history (historial de cambios de estado)
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
    console.log('Tabla lead_status_history creada o ya existente');

    console.log('Todas las tablas han sido creadas exitosamente');

  } catch (error) {
    console.error('Error al crear las tablas:', error);
  } finally {
    // Cerramos la conexión
    await sequelize.close();
  }
}

// Ejecutar la función si este archivo es llamado directamente
if (process.argv[1] === import.meta.url) {
  createTables()
    .then(() => {
      console.log('Proceso de migración completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error en el proceso de migración:', error);
      process.exit(1);
    });
}

export default createTables; 
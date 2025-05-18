import sequelize from './config/database.js';
import { Case, Client, Document, CaseNote, CaseStatusHistory } from './models/index.js';
import createPermissionsTables from './migrations/create-permissions-tables.js';
import fs from 'fs';
import { execSync } from 'child_process';

async function initDB() {
  try {
    // Probar la conexión
    await sequelize.authenticate();
    console.log('Conexión establecida correctamente.');

    // Sincronizar todos los modelos con la base de datos
    await sequelize.sync({ alter: true });
    console.log('Modelos sincronizados correctamente.');

    // Crear tablas para el sistema de permisos y leads
    await createPermissionsTables();
    console.log('Tablas de permisos y leads inicializadas correctamente.');

    // Run the migration fix to add phone and calendlyUrl columns
    try {
      console.log('Running migration fix for agent table...');
      execSync('node migration-fix.js', { stdio: 'inherit' });
      console.log('Migration fix completed successfully.');
    } catch (migrationError) {
      console.error('Error running migration fix:', migrationError);
    }

    console.log('Base de datos inicializada correctamente.');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
  } finally {
    // Cerrar la conexión
    await sequelize.close();
  }
}

// Ejecutar la función si este archivo es llamado directamente
if (process.argv[1] === import.meta.url) {
  initDB()
    .then(() => {
      console.log('Proceso de inicialización completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error en el proceso de inicialización:', error);
      process.exit(1);
    });
}

export default initDB; 
import sequelize from '../config/database.js';

export async function up() {
  try {
    await sequelize.query(`
      ALTER TABLE lead_details
      ADD COLUMN partita_iva VARCHAR(11) NULL;
    `);
    console.log('Added partita_iva column to lead_details table');
  } catch (error) {
    console.error('Error adding partita_iva column:', error);
    throw error;
  }
}

export async function down() {
  try {
    await sequelize.query(`
      ALTER TABLE lead_details
      DROP COLUMN partita_iva;
    `);
    console.log('Removed partita_iva column from lead_details table');
  } catch (error) {
    console.error('Error removing partita_iva column:', error);
    throw error;
  }
} 
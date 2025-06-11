import sequelize from '../config/database.js';

async function addPensionatoFields() {
  try {
    console.log('Adding pensionato fields to lead_details table...');

    // Add new columns for pensionato
    await sequelize.query(`
      ALTER TABLE lead_details
      ADD COLUMN IF NOT EXISTS pension_authority VARCHAR(100),
      ADD COLUMN IF NOT EXISTS pension_type VARCHAR(50);
    `);

    console.log('Pensionato fields added successfully');
  } catch (error) {
    console.error('Error adding pensionato fields:', error);
    throw error;
  }
}

export default addPensionatoFields; 
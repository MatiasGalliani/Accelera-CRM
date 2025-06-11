import sequelize from '../config/database.js';

async function addSecondarySelection() {
  try {
    console.log('Adding secondary_selection field to lead_details table...');

    // Add new column for secondary_selection
    await sequelize.query(`
      ALTER TABLE lead_details
      ADD COLUMN IF NOT EXISTS secondary_selection VARCHAR(50);
    `);

    console.log('Secondary selection field added successfully');
  } catch (error) {
    console.error('Error adding secondary selection field:', error);
    throw error;
  }
}

export default addSecondarySelection; 
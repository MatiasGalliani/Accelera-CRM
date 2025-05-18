import sequelize from './config/database.js';

async function addResidenceCityColumn() {
  try {
    console.log('Running migration to add residence_city column to lead_details table');
    
    // Get the QueryInterface
    const queryInterface = sequelize.getQueryInterface();
    
    // Add the residence_city column
    await queryInterface.addColumn('lead_details', 'residence_city', {
      type: sequelize.Sequelize.STRING(100),
      allowNull: true
    });
    
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
addResidenceCityColumn(); 
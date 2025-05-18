import sequelize from './config/database.js';

async function runMigration() {
  const queryInterface = sequelize.getQueryInterface();
  const transaction = await sequelize.transaction();

  try {
    console.log('Starting migration to add phone and calendlyUrl to agents table...');

    // Check if phone column exists
    const hasPhoneColumn = await queryInterface.describeTable('agents')
      .then(tableDefinition => 'phone' in tableDefinition)
      .catch(() => false);

    // Add phone column if it doesn't exist
    if (!hasPhoneColumn) {
      console.log('Adding phone column to agents table...');
      await queryInterface.addColumn(
        'agents',
        'phone',
        {
          type: sequelize.Sequelize.STRING(50),
          allowNull: true
        },
        { transaction }
      );
      console.log('Phone column added successfully.');
    } else {
      console.log('Phone column already exists.');
    }

    // Check if calendly_url column exists
    const hasCalendlyUrlColumn = await queryInterface.describeTable('agents')
      .then(tableDefinition => 'calendly_url' in tableDefinition)
      .catch(() => false);

    // Add calendly_url column if it doesn't exist
    if (!hasCalendlyUrlColumn) {
      console.log('Adding calendly_url column to agents table...');
      await queryInterface.addColumn(
        'agents',
        'calendly_url',
        {
          type: sequelize.Sequelize.STRING(255),
          allowNull: true
        },
        { transaction }
      );
      console.log('Calendly URL column added successfully.');
    } else {
      console.log('Calendly URL column already exists.');
    }

    // Commit the transaction
    await transaction.commit();
    console.log('Migration completed successfully.');
  } catch (error) {
    // Rollback in case of error
    await transaction.rollback();
    console.error('Migration failed:', error);
  } finally {
    // Close the connection
    await sequelize.close();
  }
}

// Run the migration
runMigration(); 
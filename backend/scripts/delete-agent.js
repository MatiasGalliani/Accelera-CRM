const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'case_management',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log
  }
);

async function deleteAgent(email) {
  try {
    console.log(`Attempting to delete agent with email: ${email}`);
    
    const result = await sequelize.query(
      'DELETE FROM agents WHERE email = :email',
      {
        replacements: { email },
        type: Sequelize.QueryTypes.DELETE
      }
    );

    console.log('Delete result:', result);
    
    if (result[1] === 0) {
      console.log(`No agent found with email: ${email}`);
    } else {
      console.log(`Successfully deleted agent with email: ${email}`);
    }
  } catch (error) {
    console.error('Error deleting agent:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the script
const email = 'matiasgalliani00@gmail.com';
deleteAgent(email)
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error in script:', error);
    process.exit(1);
  }); 
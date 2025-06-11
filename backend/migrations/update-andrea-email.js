import sequelize from '../config/database.js';

async function updateAndreaEmail() {
  try {
    console.log('Updating Andrea Friggieri\'s email address...');

    // First, check if another agent is using the target email
    const [existingAgent] = await sequelize.query(`
      SELECT id, first_name, last_name, email 
      FROM agents 
      WHERE email = 'it@creditplan.it';
    `);

    if (existingAgent && existingAgent.length > 0) {
      console.log(`Found existing agent using the email: ${existingAgent[0].first_name} ${existingAgent[0].last_name}`);
      
      // Update the existing agent's email to a temporary one
      await sequelize.query(`
        UPDATE agents 
        SET email = 'temp_${existingAgent[0].id}@creditplan.it'
        WHERE id = ${existingAgent[0].id};
      `);
      
      console.log(`Temporarily updated existing agent's email to: temp_${existingAgent[0].id}@creditplan.it`);
    }

    // Now update Andrea's email
    await sequelize.query(`
      UPDATE agents 
      SET email = 'matiasgalliani00@gmail.com'
      WHERE first_name = 'Andrea' AND last_name = 'Friggieri';
    `);

    console.log('Email address updated successfully');
  } catch (error) {
    console.error('Error updating email address:', error);
    throw error;
  }
}

export default updateAndreaEmail; 
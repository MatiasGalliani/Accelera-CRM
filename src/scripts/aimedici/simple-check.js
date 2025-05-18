import sequelize from './config/database.js';

async function simpleCheck() {
  console.log('Checking aimedici agents...');
  
  try {
    // Simple direct query 
    const [results] = await sequelize.query(`
      SELECT 
        a.id,
        a.email, 
        a.first_name, 
        a.last_name,
        als.source
      FROM 
        agents a
      JOIN 
        agent_lead_sources als ON a.id = als.agent_id
      WHERE 
        als.source = 'aimedici'
      AND
        a.role = 'agent'
      AND
        a.is_active = true
    `);
    
    console.log(`Found ${results.length} active agents with aimedici source:`);
    
    results.forEach((agent, index) => {
      console.log(`${index + 1}. ${agent.first_name} ${agent.last_name} (${agent.email})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

simpleCheck(); 
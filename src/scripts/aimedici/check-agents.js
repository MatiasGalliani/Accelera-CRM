import sequelize from './config/database.js';

/**
 * Function to check all agents assigned to aimedici
 */
async function checkAimediciAgents() {
  try {
    console.log('Checking all agents assigned to the aimedici lead source...');
    
    // Query to get all agents with aimedici source
    const [aimediciAgents] = await sequelize.query(`
      SELECT 
        a.id, 
        a.first_name, 
        a.last_name, 
        a.email, 
        a.role,
        a.is_active,
        a.firebase_uid
      FROM agents a
      JOIN agent_lead_sources als ON a.id = als.agent_id
      WHERE als.source = 'aimedici'
      ORDER BY a.id
    `);
    
    console.log(`\nFound ${aimediciAgents.length} agents assigned to aimedici:`);
    
    if (aimediciAgents.length === 0) {
      console.log("No agents found with aimedici source!");
    } else {
      aimediciAgents.forEach((agent, idx) => {
        console.log(`${idx + 1}. ${agent.first_name} ${agent.last_name} (${agent.email})`);
        console.log(`   Role: ${agent.role}, Active: ${agent.is_active ? 'Yes' : 'No'}, ID: ${agent.id}`);
        console.log(`   Firebase UID: ${agent.firebase_uid}`);
      });
      
      // Check only active agents for round robin
      const activeAgents = aimediciAgents.filter(a => a.is_active && a.role === 'agent');
      
      console.log(`\nActive agents in round robin for aimedici: ${activeAgents.length}`);
      activeAgents.forEach((agent, idx) => {
        console.log(`${idx + 1}. ${agent.first_name} ${agent.last_name} (${agent.email})`);
      });
    }
    
    // Additionally, let's directly check the agent_lead_sources table
    console.log('\nDirectly checking agent_lead_sources table for aimedici:');
    const [leadSources] = await sequelize.query(`
      SELECT als.*, a.email, a.first_name, a.last_name
      FROM agent_lead_sources als
      JOIN agents a ON als.agent_id = a.id
      WHERE als.source = 'aimedici'
    `);
    
    console.log(`Found ${leadSources.length} entries for aimedici source in agent_lead_sources table:`);
    leadSources.forEach((entry, idx) => {
      console.log(`${idx + 1}. Agent ID: ${entry.agent_id}, Source ID: ${entry.id}`);
      console.log(`   Agent: ${entry.first_name} ${entry.last_name} (${entry.email})`);
      console.log(`   Created at: ${entry.created_at}`);
    });
    
  } catch (error) {
    console.error('Error checking aimedici agents:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the function
checkAimediciAgents()
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 
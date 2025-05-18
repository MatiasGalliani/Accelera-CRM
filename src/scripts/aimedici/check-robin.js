import sequelize from './config/database.js';

async function checkAimediciRobin() {
  try {
    console.log('Checking AIMEDICI round robin directly...\n');
    
    // Direct query to check active agents with aimedici source
    const [aimediciAgents] = await sequelize.query(`
      SELECT 
        a.id, 
        a.first_name, 
        a.last_name, 
        a.email,
        a.role,
        a.is_active
      FROM agents a
      JOIN agent_lead_sources als ON a.id = als.agent_id
      WHERE als.source = 'aimedici'
      AND a.is_active = true
      AND a.role = 'agent'
      ORDER BY a.id
    `);
    
    console.log(`Found ${aimediciAgents.length} active agents in AIMEDICI round robin:\n`);
    
    if (aimediciAgents.length === 0) {
      console.log('No agents found for AIMEDICI round robin!');
    } else {
      aimediciAgents.forEach((agent, idx) => {
        console.log(`${idx + 1}. ${agent.first_name} ${agent.last_name} (${agent.email})`);
        console.log(`   Agent ID: ${agent.id}, Active: ${agent.is_active ? 'Yes' : 'No'}, Role: ${agent.role}\n`);
      });
    }
    
    // Show all aimedici source entries
    console.log('All AIMEDICI source entries in agent_lead_sources table:');
    
    const [allEntries] = await sequelize.query(`
      SELECT als.*, a.email, a.first_name, a.last_name, a.role, a.is_active
      FROM agent_lead_sources als
      JOIN agents a ON als.agent_id = a.id
      WHERE als.source = 'aimedici'
      ORDER BY als.id
    `);
    
    allEntries.forEach((entry, idx) => {
      console.log(`${idx + 1}. Agent: ${entry.first_name} ${entry.last_name} (${entry.email})`);
      console.log(`   ID: ${entry.id}, Agent ID: ${entry.agent_id}`);
      console.log(`   Role: ${entry.role}, Active: ${entry.is_active ? 'Yes' : 'No'}\n`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the function
checkAimediciRobin()
  .then(() => console.log('Check complete.'))
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 
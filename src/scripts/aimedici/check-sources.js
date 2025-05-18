import sequelize from './config/database.js';

/**
 * Check agents with aimedici lead source
 */
async function checkAimediciSources() {
  try {
    console.log('Checking agents with aimedici lead source...');
    
    // Direct SQL query to check agent_lead_sources table for aimedici
    const [aimediciEntries] = await sequelize.query(`
      SELECT 
        als.id AS source_id, 
        als.agent_id, 
        als.source, 
        als.created_at,
        a.first_name,
        a.last_name,
        a.email,
        a.role,
        a.is_active
      FROM agent_lead_sources als
      JOIN agents a ON als.agent_id = a.id
      WHERE als.source = 'aimedici'
      ORDER BY a.id
    `);
    
    console.log(`\nFound ${aimediciEntries.length} entries for aimedici in agent_lead_sources table:`);
    
    if (aimediciEntries.length === 0) {
      console.log('No aimedici source entries found!');
    } else {
      aimediciEntries.forEach((entry, idx) => {
        console.log(`${idx + 1}. ${entry.first_name} ${entry.last_name} (${entry.email})`);
        console.log(`   Role: ${entry.role}, Active: ${entry.is_active ? 'Yes' : 'No'}`);
        console.log(`   Source ID: ${entry.source_id}, Agent ID: ${entry.agent_id}`);
        console.log(`   Created at: ${entry.created_at}`);
      });
    }
    
    // Count active agents that will participate in the round robin
    const activeAgents = aimediciEntries.filter(entry => 
      entry.is_active && entry.role === 'agent'
    );
    
    console.log(`\nActive agents in round robin for aimedici: ${activeAgents.length}`);
    
    if (activeAgents.length > 0) {
      console.log('\nAgents in the round robin:');
      activeAgents.forEach((agent, idx) => {
        console.log(`${idx + 1}. ${agent.first_name} ${agent.last_name} (${agent.email})`);
      });
    } else {
      console.log('No active agents for aimedici round robin!');
    }
    
  } catch (error) {
    console.error('Error checking aimedici sources:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the function
checkAimediciSources()
  .then(() => console.log('Check complete.'))
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 
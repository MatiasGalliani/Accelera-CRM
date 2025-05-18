import sequelize from './config/database.js';

/**
 * Directly add aimedici source to Matias Galliani
 */
async function directlyAddAimediciToMatias() {
  try {
    console.log('Directly adding aimedici source to Matias Galliani...');
    
    // First find Matias by email to get his agent ID
    const [agents] = await sequelize.query(`
      SELECT id, first_name, last_name, email, role, is_active
      FROM agents
      WHERE email = 'matiasgalliani00@gmail.com'
    `);
    
    if (agents.length === 0) {
      console.error('Agent not found in database');
      return;
    }
    
    const agent = agents[0];
    console.log(`Found agent: ${agent.first_name} ${agent.last_name} (ID: ${agent.id})`);
    
    // Check if this agent already has aimedici source
    const [sources] = await sequelize.query(`
      SELECT id, source
      FROM agent_lead_sources
      WHERE agent_id = ${agent.id}
    `);
    
    console.log('\nCurrent lead sources:');
    sources.forEach(source => {
      console.log(`- ${source.source} (ID: ${source.id})`);
    });
    
    // Check if aimedici already exists
    const existingAimedici = sources.find(s => s.source === 'aimedici');
    
    if (existingAimedici) {
      console.log('\nAgent already has aimedici source assigned. Nothing to do.');
    } else {
      // Directly insert the aimedici source
      const [result] = await sequelize.query(`
        INSERT INTO agent_lead_sources (agent_id, source, created_at)
        VALUES (${agent.id}, 'aimedici', NOW())
        RETURNING id
      `);
      
      if (result.length > 0) {
        console.log(`\n✅ Successfully added aimedici source with ID: ${result[0].id}`);
      } else {
        console.log('\n❌ Failed to add aimedici source');
      }
    }
    
    // Verify the current state
    const [updatedSources] = await sequelize.query(`
      SELECT id, source
      FROM agent_lead_sources
      WHERE agent_id = ${agent.id}
      ORDER BY source
    `);
    
    console.log('\nUpdated lead sources:');
    updatedSources.forEach(source => {
      console.log(`- ${source.source} (ID: ${source.id})`);
    });
    
    // Now check all agents assigned to aimedici
    const [aimediciAgents] = await sequelize.query(`
      SELECT a.id, a.first_name, a.last_name, a.email
      FROM agents a
      JOIN agent_lead_sources als ON a.id = als.agent_id
      WHERE als.source = 'aimedici'
      AND a.is_active = true
      AND a.role = 'agent'
      ORDER BY a.id
    `);
    
    console.log(`\nAIMEDICI: ${aimediciAgents.length} agents in round robin:`);
    aimediciAgents.forEach((agent, idx) => {
      console.log(`${idx + 1}. ${agent.first_name} ${agent.last_name} (${agent.email})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
    console.log('\nDone. Refresh the frontend to see changes.');
  }
}

// Run the function
directlyAddAimediciToMatias()
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 
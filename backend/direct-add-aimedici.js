import sequelize from './config/database.js';

async function directAddAimedici() {
  try {
    console.log('Starting direct SQL operation to add aimedici source...');
    
    // Use raw SQL queries to avoid any ORM issues
    
    // 1. Get your agent ID 
    const agentEmail = 'matiasgalliani00@gmail.com';
    const [agents] = await sequelize.query(
      `SELECT id, first_name, last_name, role FROM agents 
       WHERE email = :email AND is_active = true`,
      {
        replacements: { email: agentEmail }
      }
    );
    
    if (!agents || agents.length === 0) {
      console.log(`❌ No active agent found with email: ${agentEmail}`);
      return;
    }
    
    const agent = agents[0];
    console.log(`✅ Found agent: ${agent.first_name} ${agent.last_name} (ID: ${agent.id})`);
    
    // 2. Delete any existing aimedici source to avoid duplicates
    await sequelize.query(
      `DELETE FROM agent_lead_sources 
       WHERE agent_id = :agentId AND source = 'aimedici'`,
      {
        replacements: { agentId: agent.id }
      }
    );
    console.log('Cleaned up any existing aimedici source entries');
    
    // 3. Insert the aimedici source
    const [result] = await sequelize.query(
      `INSERT INTO agent_lead_sources (agent_id, source, created_at)
       VALUES (:agentId, 'aimedici', NOW())
       RETURNING id`,
      {
        replacements: { agentId: agent.id }
      }
    );
    
    if (result && result.length > 0) {
      console.log(`✅ Successfully added aimedici source with ID: ${result[0].id}`);
    } else {
      console.log('❌ Failed to add aimedici source');
    }
    
    // 4. Check if aiquinto exists, add if missing
    const [aiquintoSources] = await sequelize.query(
      `SELECT id FROM agent_lead_sources 
       WHERE agent_id = :agentId AND source = 'aiquinto'`,
      {
        replacements: { agentId: agent.id }
      }
    );
    
    if (!aiquintoSources || aiquintoSources.length === 0) {
      // Add aiquinto source
      const [aiquintoResult] = await sequelize.query(
        `INSERT INTO agent_lead_sources (agent_id, source, created_at)
         VALUES (:agentId, 'aiquinto', NOW())
         RETURNING id`,
        {
          replacements: { agentId: agent.id }
        }
      );
      
      if (aiquintoResult && aiquintoResult.length > 0) {
        console.log(`✅ Also added aiquinto source with ID: ${aiquintoResult[0].id}`);
      }
    } else {
      console.log(`✓ Agent already has aiquinto source with ID: ${aiquintoSources[0].id}`);
    }
    
    // 5. Verify current sources
    const [currentSources] = await sequelize.query(
      `SELECT source FROM agent_lead_sources WHERE agent_id = :agentId`,
      {
        replacements: { agentId: agent.id }
      }
    );
    
    console.log('\nCurrent lead sources for this agent:');
    if (currentSources && currentSources.length > 0) {
      currentSources.forEach((src, idx) => {
        console.log(`${idx + 1}. ${src.source}`);
      });
      
      // Check if both sources are present
      const hasAimedici = currentSources.some(src => src.source === 'aimedici');
      const hasAiquinto = currentSources.some(src => src.source === 'aiquinto');
      
      if (hasAimedici && hasAiquinto) {
        console.log('\n✅ SUCCESS: Agent now has both required sources');
      } else {
        console.log('\n❌ WARNING: Agent is still missing some sources:');
        if (!hasAimedici) console.log('- Missing aimedici');
        if (!hasAiquinto) console.log('- Missing aiquinto');
      }
    } else {
      console.log('❌ Agent has no lead sources at all');
    }
    
  } catch (error) {
    console.error('Error in direct SQL operation:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the function
directAddAimedici().catch(console.error); 
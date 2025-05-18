import sequelize from './config/database.js';

/**
 * Add aimedici lead source to Matias Galliani
 */
async function addAimediciToMatias() {
  try {
    console.log('Adding aimedici source to matiasgalliani00@gmail.com...');
    
    // Find Matias's agent record
    const [agentInfo] = await sequelize.query(
      `SELECT id, first_name, last_name, email, role, firebase_uid 
       FROM agents 
       WHERE email = :email`,
      {
        replacements: { email: 'matiasgalliani00@gmail.com' }
      }
    );
    
    if (!agentInfo || agentInfo.length === 0) {
      console.log('❌ ERROR: Agent matiasgalliani00@gmail.com not found in the database');
      return;
    }
    
    const agent = agentInfo[0];
    console.log(`\nAgent found: ${agent.first_name} ${agent.last_name} (ID: ${agent.id})`);
    console.log(`Firebase UID: ${agent.firebase_uid}`);
    
    // Check current lead sources
    const [currentSources] = await sequelize.query(
      `SELECT id, source, created_at
       FROM agent_lead_sources 
       WHERE agent_id = :agentId`,
      {
        replacements: { agentId: agent.id }
      }
    );
    
    console.log('\nCurrent lead sources:');
    currentSources.forEach((src, idx) => {
      console.log(`${idx + 1}. ${src.source} (ID: ${src.id}, Created: ${src.created_at})`);
    });
    
    // Check if aimedici already exists
    const hasAimedici = currentSources.some(src => src.source === 'aimedici');
    
    if (hasAimedici) {
      console.log('\n✅ Agent already has aimedici source in PostgreSQL');
    } else {
      // Add aimedici source
      console.log('\nAdding aimedici source...');
      
      const [result] = await sequelize.query(
        `INSERT INTO agent_lead_sources (agent_id, source, created_at)
         VALUES (:agentId, 'aimedici', NOW())
         RETURNING id`,
        {
          replacements: { agentId: agent.id }
        }
      );
      
      if (result && result.length > 0) {
        console.log(`✅ aimedici source added with ID: ${result[0].id}`);
      } else {
        console.log('❌ Failed to add aimedici source');
      }
    }
    
    // Verify final state
    const [updatedSources] = await sequelize.query(
      `SELECT id, source, created_at
       FROM agent_lead_sources 
       WHERE agent_id = :agentId
       ORDER BY source`,
      {
        replacements: { agentId: agent.id }
      }
    );
    
    console.log('\nUpdated lead sources:');
    updatedSources.forEach((src, idx) => {
      console.log(`${idx + 1}. ${src.source} (ID: ${src.id}, Created: ${src.created_at})`);
    });
    
    // Count agents with aimedici for round robin
    const [aimediciAgents] = await sequelize.query(
      `SELECT a.id, a.first_name, a.last_name, a.email
       FROM agents a
       JOIN agent_lead_sources als ON a.id = als.agent_id
       WHERE als.source = 'aimedici'
       AND a.is_active = true
       AND a.role = 'agent'
       ORDER BY a.id`
    );
    
    console.log(`\nAIMEDICI: ${aimediciAgents.length} agents in round robin`);
    aimediciAgents.forEach((agent, idx) => {
      console.log(`${idx + 1}. ${agent.first_name} ${agent.last_name} (${agent.email})`);
    });
    
    console.log('\n✅ Task completed - Please refresh the frontend to see changes');
    
  } catch (error) {
    console.error('Error adding aimedici to Matias:', error);
  } finally {
    // Close database connection
    await sequelize.close();
  }
}

// Run the function
addAimediciToMatias().catch(console.error); 
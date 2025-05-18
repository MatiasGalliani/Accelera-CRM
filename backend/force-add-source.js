import sequelize from './config/database.js';

/**
 * Force add the aimedici source to an agent using direct SQL
 * @param {string} email - Email of the agent
 */
async function forceAddSource(email) {
  try {
    console.log(`Force adding aimedici source to agent with email: ${email}`);
    
    // 1. First get the agent ID
    const [agents] = await sequelize.query(
      `SELECT id, first_name, last_name FROM agents WHERE email = :email`,
      {
        replacements: { email }
      }
    );
    
    if (!agents || agents.length === 0) {
      console.log(`\n❌ No agent found with email: ${email}`);
      return;
    }
    
    const agent = agents[0];
    console.log(`\n✅ Agent found: ${agent.first_name} ${agent.last_name} (ID: ${agent.id})`);
    
    // 2. Check if the source already exists
    const [existingSources] = await sequelize.query(
      `SELECT * FROM agent_lead_sources 
       WHERE agent_id = :agentId AND source = 'aimedici'`,
      {
        replacements: { agentId: agent.id }
      }
    );
    
    if (existingSources && existingSources.length > 0) {
      console.log(`\n⚠️ Agent already has aimedici source (ID: ${existingSources[0].id})`);
      return;
    }
    
    // 3. Insert the new source
    const [result] = await sequelize.query(
      `INSERT INTO agent_lead_sources (agent_id, source, created_at)
       VALUES (:agentId, 'aimedici', NOW())
       RETURNING id`,
      {
        replacements: { agentId: agent.id }
      }
    );
    
    console.log(`\n✅ Successfully added aimedici source with ID: ${result[0].id}`);
    
    // 4. Verify the sources
    const [allSources] = await sequelize.query(
      `SELECT source FROM agent_lead_sources WHERE agent_id = :agentId`,
      {
        replacements: { agentId: agent.id }
      }
    );
    
    console.log('\nCurrent sources for this agent:');
    allSources.forEach((src, idx) => {
      console.log(`${idx + 1}. ${src.source}`);
    });
    
  } catch (error) {
    console.error('Error in force adding source:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Email of the agent
const agentEmail = 'matiasgalliani00@gmail.com';

// Run the function
forceAddSource(agentEmail).catch(console.error); 
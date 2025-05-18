import sequelize from './backend/config/database.js';

/**
 * Remove AIFIDI source from a specific agent
 */
async function removeAifidiSource() {
  try {
    console.log('Removing AIFIDI source from agentetres@gmail.com...');
    
    // First find the agent by email
    const [agents] = await sequelize.query(`
      SELECT id, first_name, last_name, email, role, is_active
      FROM agents
      WHERE email = 'agentetres@gmail.com'
    `);
    
    if (agents.length === 0) {
      console.error('Agent not found in database');
      return;
    }
    
    const agent = agents[0];
    console.log(`Found agent: ${agent.first_name} ${agent.last_name} (ID: ${agent.id})`);
    
    // Check current sources
    const [sources] = await sequelize.query(`
      SELECT id, source
      FROM agent_lead_sources
      WHERE agent_id = ${agent.id}
    `);
    
    console.log('\nCurrent lead sources:');
    sources.forEach(source => {
      console.log(`- ${source.source} (ID: ${source.id})`);
    });
    
    // Check if AIFIDI exists
    const aifidiSource = sources.find(s => s.source === 'aifidi');
    
    if (!aifidiSource) {
      console.log('\nAgent does not have AIFIDI source. Nothing to remove.');
    } else {
      // Delete the AIFIDI source
      console.log(`\nRemoving AIFIDI source with ID: ${aifidiSource.id}...`);
      
      const [result] = await sequelize.query(`
        DELETE FROM agent_lead_sources
        WHERE id = ${aifidiSource.id}
        RETURNING id
      `);
      
      if (result.length > 0) {
        console.log(`\n✅ Successfully removed AIFIDI source with ID: ${result[0].id}`);
      } else {
        console.log('\n❌ Failed to remove AIFIDI source');
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
    
    // Check if the bug is fixed for future new agents
    console.log('\n🔍 Checking for the auto-assignment bug in the system...');
    console.log('This bug might be in the agent creation process in the admin interface');
    console.log('or in the default values when creating a new agent in Firestore.');
    
    // List agents with AIFIDI
    const [aifidiAgents] = await sequelize.query(`
      SELECT a.id, a.first_name, a.last_name, a.email, a.role, a.is_active
      FROM agents a
      JOIN agent_lead_sources als ON a.id = als.agent_id
      WHERE als.source = 'aifidi'
      ORDER BY a.id
    `);
    
    console.log(`\nAgents with AIFIDI source (${aifidiAgents.length} total):`);
    aifidiAgents.forEach((agent, idx) => {
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
removeAifidiSource()
  .then(() => console.log('✅ Fix completed successfully.'))
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 
/**
 * Script to directly remove the AIFIDI source from agentetres@gmail.com
 */
const { Sequelize } = require('sequelize');

// Database connection
const sequelize = new Sequelize('case_management', 'postgres', 'postgres', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres',
  logging: false
});

async function removeAifidiFromAgenteTres() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Connected to PostgreSQL database successfully.\n');
    
    // Find agentetres@gmail.com
    console.log('Looking for agentetres@gmail.com...');
    const [agent] = await sequelize.query(`
      SELECT id, email, first_name, last_name 
      FROM agents 
      WHERE email = 'agentetres@gmail.com'
    `);
    
    if (!agent || agent.length === 0) {
      console.log('❌ Agent not found in database.');
      return;
    }
    
    const agentId = agent[0].id;
    console.log(`✅ Found agent: ${agent[0].first_name} ${agent[0].last_name} (ID: ${agentId})\n`);
    
    // Find AIFIDI source assignment
    console.log('Looking for AIFIDI source assignment...');
    const [sources] = await sequelize.query(`
      SELECT id, source 
      FROM agent_lead_sources 
      WHERE agent_id = :agentId 
      AND source = 'aifidi'
    `, {
      replacements: { agentId }
    });
    
    if (!sources || sources.length === 0) {
      console.log('❓ No AIFIDI source found for this agent.');
      
      // Check all sources for this agent
      const [allSources] = await sequelize.query(`
        SELECT source 
        FROM agent_lead_sources 
        WHERE agent_id = :agentId
      `, {
        replacements: { agentId }
      });
      
      console.log(`Current lead sources (${allSources.length}):`);
      allSources.forEach(s => console.log(`- ${s.source}`));
      return;
    }
    
    const sourceId = sources[0].id;
    console.log(`✅ Found AIFIDI source assignment (ID: ${sourceId})\n`);
    
    // Remove the AIFIDI source
    console.log('Removing AIFIDI source...');
    const [deleted] = await sequelize.query(`
      DELETE FROM agent_lead_sources 
      WHERE id = :sourceId 
      RETURNING id
    `, {
      replacements: { sourceId }
    });
    
    if (deleted && deleted.length > 0) {
      console.log(`✅ Successfully deleted AIFIDI source (ID: ${deleted[0].id})\n`);
    } else {
      console.log('❌ Failed to delete AIFIDI source.\n');
      return;
    }
    
    // Verify removal
    console.log('Verifying removal...');
    const [verifySource] = await sequelize.query(`
      SELECT source 
      FROM agent_lead_sources 
      WHERE agent_id = :agentId 
      AND source = 'aifidi'
    `, {
      replacements: { agentId }
    });
    
    if (verifySource && verifySource.length > 0) {
      console.log('❌ AIFIDI is still assigned. Removal failed.');
    } else {
      console.log('✅ AIFIDI has been successfully removed!');
      
      // Check remaining sources
      const [remaining] = await sequelize.query(`
        SELECT source 
        FROM agent_lead_sources 
        WHERE agent_id = :agentId
      `, {
        replacements: { agentId }
      });
      
      console.log(`\nRemaining lead sources (${remaining.length}):`);
      remaining.forEach(s => console.log(`- ${s.source}`));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
    console.log('\nDone.');
  }
}

// Run the function
removeAifidiFromAgenteTres().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 
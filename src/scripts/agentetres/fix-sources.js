/**
 * Script to ensure agentetres@gmail.com has the correct lead sources
 * - Should HAVE: aiquinto and aimedici
 * - Should NOT have: aifidi
 */
const { Sequelize } = require('sequelize');

// Database connection
const sequelize = new Sequelize('case_management', 'postgres', 'postgres', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres',
  logging: false
});

async function fixAgenteTresSources() {
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
    
    // Check current sources
    console.log('Checking current lead sources...');
    const [currentSources] = await sequelize.query(`
      SELECT id, source 
      FROM agent_lead_sources 
      WHERE agent_id = :agentId
    `, {
      replacements: { agentId }
    });
    
    console.log(`Current lead sources (${currentSources.length}):`);
    const currentSourceMap = {};
    currentSources.forEach(s => {
      console.log(`- ${s.source} (ID: ${s.id})`);
      currentSourceMap[s.source] = s.id;
    });
    
    console.log('\nEnsuring correct lead sources...');
    
    // 1. Remove aifidi if present
    if (currentSourceMap['aifidi']) {
      console.log('Removing aifidi source...');
      await sequelize.query(`
        DELETE FROM agent_lead_sources 
        WHERE id = :sourceId
      `, {
        replacements: { sourceId: currentSourceMap['aifidi'] }
      });
      console.log('✅ Removed aifidi source');
    } else {
      console.log('✅ Agent does not have aifidi (correct)');
    }
    
    // 2. Ensure aiquinto is present
    if (!currentSourceMap['aiquinto']) {
      console.log('Adding aiquinto source...');
      await sequelize.query(`
        INSERT INTO agent_lead_sources (agent_id, source, created_at, updated_at)
        VALUES (:agentId, 'aiquinto', NOW(), NOW())
      `, {
        replacements: { agentId }
      });
      console.log('✅ Added aiquinto source');
    } else {
      console.log('✅ Agent already has aiquinto source (correct)');
    }
    
    // 3. Ensure aimedici is present
    if (!currentSourceMap['aimedici']) {
      console.log('Adding aimedici source...');
      await sequelize.query(`
        INSERT INTO agent_lead_sources (agent_id, source, created_at, updated_at)
        VALUES (:agentId, 'aimedici', NOW(), NOW())
      `, {
        replacements: { agentId }
      });
      console.log('✅ Added aimedici source');
    } else {
      console.log('✅ Agent already has aimedici source (correct)');
    }
    
    // Verify final state
    console.log('\nVerifying final state...');
    const [finalSources] = await sequelize.query(`
      SELECT id, source 
      FROM agent_lead_sources 
      WHERE agent_id = :agentId 
      ORDER BY source
    `, {
      replacements: { agentId }
    });
    
    console.log(`Final lead sources (${finalSources.length}):`);
    finalSources.forEach(s => {
      console.log(`- ${s.source} (ID: ${s.id})`);
    });
    
    // Check for success
    const hasAiquinto = finalSources.some(s => s.source === 'aiquinto');
    const hasAimedici = finalSources.some(s => s.source === 'aimedici');
    const hasAifidi = finalSources.some(s => s.source === 'aifidi');
    
    if (hasAiquinto && hasAimedici && !hasAifidi) {
      console.log('\n✅ SUCCESS: Agent has correct lead sources!');
    } else {
      console.log('\n❌ FAILED: Agent does not have the correct lead sources.');
      
      if (!hasAiquinto) console.log('  - Missing aiquinto');
      if (!hasAimedici) console.log('  - Missing aimedici');
      if (hasAifidi) console.log('  - Has unwanted aifidi');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
    console.log('\nDone.');
  }
}

// Run the function
fixAgenteTresSources().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 
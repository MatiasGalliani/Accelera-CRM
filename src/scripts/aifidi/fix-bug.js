import sequelize from './config/database.js';

/**
 * Fix the AIFIDI auto-assignment bug
 */
async function fixAifidiBug() {
  try {
    console.log('Starting to fix AIFIDI assignment bug...');
    
    // 1. Check which agents have AIFIDI assigned
    console.log('\n1. Checking agents with AIFIDI assigned...');
    const [aifidiAgents] = await sequelize.query(`
      SELECT a.id, a.email, a.first_name, a.last_name, a.role, a.is_active, als.id as source_id
      FROM agent_lead_sources als
      JOIN agents a ON a.id = als.agent_id
      WHERE als.source = 'aifidi'
      ORDER BY a.id
    `);
    
    console.log(`Found ${aifidiAgents.length} agents with AIFIDI assigned:`);
    aifidiAgents.forEach((agent, idx) => {
      console.log(`${idx + 1}. ${agent.first_name} ${agent.last_name} (${agent.email})`);
      console.log(`   Role: ${agent.role}, Source ID: ${agent.source_id}`);
    });
    
    // 2. Check if the new agent has AIFIDI
    console.log('\n2. Checking if agentetres@gmail.com has AIFIDI...');
    const agenteTres = aifidiAgents.find(a => a.email === 'agentetres@gmail.com');
    
    if (agenteTres) {
      console.log(`✅ Found agentetres@gmail.com with AIFIDI (Source ID: ${agenteTres.source_id})`);
      
      // 3. Remove AIFIDI from agentetres@gmail.com
      console.log('\n3. Removing AIFIDI from agentetres@gmail.com...');
      const [deleteResult] = await sequelize.query(`
        DELETE FROM agent_lead_sources
        WHERE id = :sourceId
        RETURNING id
      `, {
        replacements: { sourceId: agenteTres.source_id }
      });
      
      if (deleteResult && deleteResult.length > 0) {
        console.log(`✅ Successfully removed AIFIDI source (ID: ${deleteResult[0].id})`);
      } else {
        console.log('❌ Failed to remove AIFIDI source');
      }
    } else {
      console.log('❓ agentetres@gmail.com does not have AIFIDI assigned');
    }
    
    // 4. Verify the lead sources for agentetres@gmail.com
    console.log('\n4. Verifying lead sources for agentetres@gmail.com...');
    const [agentSources] = await sequelize.query(`
      SELECT a.id, a.email, als.source, als.id as source_id
      FROM agents a
      JOIN agent_lead_sources als ON a.id = als.agent_id
      WHERE a.email = 'agentetres@gmail.com'
      ORDER BY als.source
    `);
    
    if (agentSources.length === 0) {
      console.log('❌ No sources found for agentetres@gmail.com');
    } else {
      console.log(`Found ${agentSources.length} sources for agentetres@gmail.com:`);
      agentSources.forEach((source, idx) => {
        console.log(`${idx + 1}. ${source.source} (ID: ${source.source_id})`);
      });
      
      // Check if AIFIDI is still there
      const stillHasAifidi = agentSources.some(s => s.source === 'aifidi');
      if (stillHasAifidi) {
        console.log('❌ AIFIDI is still assigned to agentetres@gmail.com');
      } else {
        console.log('✅ AIFIDI has been successfully removed from agentetres@gmail.com');
      }
    }
    
    // 5. Check for the source of the bug in the codebase
    console.log('\n5. Possible source of the bug:');
    console.log('- The agent creation process in the frontend might be auto-selecting AIFIDI');
    console.log('- The default values when creating new agents in Firestore could include AIFIDI');
    console.log('- The synchronization process between Firestore and PostgreSQL might be adding AIFIDI');
    console.log('- Check syncService.js for code that assigns default lead sources to new agents');
    
    console.log('\nDone. Refresh the frontend to see the changes.');
    
  } catch (error) {
    console.error('Error fixing AIFIDI bug:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the function
fixAifidiBug()
  .then(() => console.log('✅ Fix process completed.'))
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 
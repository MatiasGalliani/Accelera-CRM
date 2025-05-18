import sequelize from './backend/config/database.js';
import admin from 'firebase-admin';
import { syncAgentFromFirestore } from './backend/services/syncService.js';
import fs from 'fs';
import path from 'path';

// Read service account file
const serviceAccountPath = './backend/app-documenti-firebase-adminsdk-fbsvc-6d34982729.json';
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Inicializar Firebase Admin si no está inicializado
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://app-documenti.firebaseio.com"
  });
}

/**
 * Script to test the fix for the AIFIDI auto-assignment bug
 * 
 * 1. Simulates creating a new agent in Firestore
 * 2. Triggers the sync to PostgreSQL
 * 3. Verifies the agent doesn't get auto-assigned to AIFIDI
 */
async function testAifidiBugFix() {
  try {
    console.log('Starting test for AIFIDI auto-assignment bug fix...');
    
    // Test agent data (simulating Firebase data)
    const testAgent = {
      uid: `test-${Date.now()}`,
      email: `testagent-${Date.now()}@test.com`,
      firstName: 'Test',
      lastName: 'Agent',
      role: 'agent',
      isActive: true,
      // Not specifying any leadSources to trigger the default behavior
    };
    
    console.log(`\n1. Creating test agent with email: ${testAgent.email}`);
    
    // Manually call the sync function (simulating a Firestore write)
    console.log('\n2. Syncing test agent to PostgreSQL...');
    const syncResult = await syncAgentFromFirestore('test-agent-id', testAgent);
    
    console.log('Sync result:', syncResult);
    
    if (!syncResult.success) {
      throw new Error(`Failed to sync agent: ${syncResult.error}`);
    }
    
    // Check if agent was created in PostgreSQL
    console.log(`\n3. Checking if agent ${testAgent.email} was created...`);
    const [pgAgent] = await sequelize.query(`
      SELECT id, email, first_name, last_name, role, is_active
      FROM agents
      WHERE email = :email
    `, {
      replacements: { email: testAgent.email }
    });
    
    if (!pgAgent || pgAgent.length === 0) {
      throw new Error('Agent was not created in PostgreSQL');
    }
    
    console.log(`✅ Agent found in PostgreSQL:`, pgAgent[0]);
    const agentId = pgAgent[0].id;
    
    // Check if any lead sources were assigned
    console.log(`\n4. Checking lead sources for agent ${testAgent.email}...`);
    const [agentSources] = await sequelize.query(`
      SELECT source
      FROM agent_lead_sources
      WHERE agent_id = :agentId
    `, {
      replacements: { agentId }
    });
    
    if (agentSources.length === 0) {
      console.log('✅ Success: No lead sources were auto-assigned');
    } else {
      console.log(`❌ Found ${agentSources.length} lead sources:`, agentSources);
      
      // Check specifically for AIFIDI
      const hasAifidi = agentSources.some(s => s.source === 'aifidi');
      if (hasAifidi) {
        console.log('❌ AIFIDI was still auto-assigned! Bug fix failed.');
      } else {
        console.log('✅ AIFIDI was not assigned, but other sources were.');
      }
    }
    
    // Clean up by removing the test agent
    console.log(`\n5. Cleaning up test data...`);
    await sequelize.query(`
      DELETE FROM agent_lead_sources
      WHERE agent_id = :agentId
    `, {
      replacements: { agentId }
    });
    
    await sequelize.query(`
      DELETE FROM agents
      WHERE id = :agentId
    `, {
      replacements: { agentId }
    });
    
    console.log('✅ Test data cleaned up');
    
    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the test
testAifidiBugFix()
  .then(() => console.log('Test script finished.'))
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 
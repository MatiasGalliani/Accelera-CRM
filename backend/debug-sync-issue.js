import admin from 'firebase-admin';
import { Agent, AgentLeadSource } from './models/leads-index.js';
import sequelize from './config/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin SDK if not already initialized
try {
  admin.app();
} catch (error) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

/**
 * Debug function to check sync issues between Firestore and PostgreSQL
 */
async function debugSyncIssue() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('========== SYNC ISSUE DEBUGGER ==========');
    console.log('Checking for discrepancies between Firestore and PostgreSQL...');
    
    // 1. Check all agents in Firestore
    console.log('\n1. CHECKING FIRESTORE AGENTS');
    const agentsSnapshot = await db.collection('agents').get();
    
    console.log(`Found ${agentsSnapshot.size} agents in Firestore`);
    
    const firestoreAgents = [];
    agentsSnapshot.forEach(doc => {
      const data = doc.data();
      firestoreAgents.push({
        id: doc.id,
        uid: data.uid,
        email: data.email,
        role: data.role,
        leadSources: Array.isArray(data.leadSources) ? data.leadSources : [],
        isActive: data.isActive !== false
      });
    });
    
    // 2. Check all agents in PostgreSQL
    console.log('\n2. CHECKING POSTGRESQL AGENTS');
    const pgAgents = await Agent.findAll({
      include: [{ model: AgentLeadSource }],
      transaction
    });
    
    console.log(`Found ${pgAgents.length} agents in PostgreSQL`);
    
    // 3. Check for specific agent: agentedos@creditplan.it
    console.log('\n3. CHECKING SPECIFIC AGENT: agentedos@creditplan.it');
    
    // Find in Firestore
    const firestoreAgentDos = firestoreAgents.find(agent => agent.email === 'agentedos@creditplan.it');
    
    if (firestoreAgentDos) {
      console.log('✅ Found in Firestore:');
      console.log(`  ID: ${firestoreAgentDos.id}`);
      console.log(`  UID: ${firestoreAgentDos.uid}`);
      console.log(`  Role: ${firestoreAgentDos.role}`);
      console.log(`  Active: ${firestoreAgentDos.isActive}`);
      console.log(`  Lead Sources: ${JSON.stringify(firestoreAgentDos.leadSources)}`);
      console.log(`  Has aimedici: ${firestoreAgentDos.leadSources.includes('aimedici')}`);
    } else {
      console.log('❌ NOT found in Firestore');
    }
    
    // Find in PostgreSQL
    const pgAgentDos = pgAgents.find(agent => agent.email === 'agentedos@creditplan.it');
    
    if (pgAgentDos) {
      console.log('\n✅ Found in PostgreSQL:');
      console.log(`  ID: ${pgAgentDos.id}`);
      console.log(`  Firebase UID: ${pgAgentDos.firebaseUid}`);
      console.log(`  Role: ${pgAgentDos.role}`);
      console.log(`  Active: ${pgAgentDos.isActive}`);
      
      const leadSources = pgAgentDos.AgentLeadSources.map(source => source.source);
      console.log(`  Lead Sources: ${JSON.stringify(leadSources)}`);
      console.log(`  Has aimedici: ${leadSources.includes('aimedici')}`);
      
      // Check if UID matches
      if (firestoreAgentDos && pgAgentDos.firebaseUid === firestoreAgentDos.uid) {
        console.log('✅ Firebase UID matches between Firestore and PostgreSQL');
      } else if (firestoreAgentDos) {
        console.log('❌ Firebase UID mismatch:');
        console.log(`  Firestore UID: ${firestoreAgentDos.uid}`);
        console.log(`  PostgreSQL Firebase UID: ${pgAgentDos.firebaseUid}`);
      }
    } else {
      console.log('❌ NOT found in PostgreSQL');
    }
    
    // 4. Test the Firestore listener
    console.log('\n4. TESTING FIRESTORE LISTENER');
    console.log('Checking if Firestore changes are being detected...');
    
    // Try to listen for changes
    const unsubscribe = db.collection('agents')
      .onSnapshot(snapshot => {
        console.log(`Received snapshot: ${snapshot.size} documents`);
        console.log('Firestore listener is working!');
      }, error => {
        console.error('Firestore listener error:', error);
      });
    
    // Wait a moment to see if listener works
    await new Promise(resolve => setTimeout(resolve, 2000));
    unsubscribe();
    
    // 5. Force a sync of the specific agent
    if (firestoreAgentDos) {
      console.log('\n5. FORCING SYNC OF SPECIFIC AGENT');
      
      // Import syncService dynamically to avoid circular dependencies
      const syncModule = await import('./services/syncService.js');
      
      console.log(`Forcing sync of agent ID: ${firestoreAgentDos.id}`);
      const syncResult = await syncModule.syncAgentFromFirestore(firestoreAgentDos.id, firestoreAgentDos);
      
      console.log('Sync result:', syncResult);
      
      // Check status after force sync
      const updatedPgAgentDos = await Agent.findOne({
        where: { email: 'agentedos@creditplan.it' },
        include: [{ model: AgentLeadSource }],
        transaction
      });
      
      if (updatedPgAgentDos) {
        const leadSources = updatedPgAgentDos.AgentLeadSources.map(source => source.source);
        console.log('\nStatus after forced sync:');
        console.log(`  Lead Sources: ${JSON.stringify(leadSources)}`);
        console.log(`  Has aimedici: ${leadSources.includes('aimedici')}`);
      }
    }
    
    console.log('\n========== DEBUG COMPLETE ==========');
    
    // Rollback so we don't affect anything
    await transaction.rollback();
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error debugging sync issue:', error);
  } finally {
    // Close the connection
    await sequelize.close();
  }
}

// Run the debug function
debugSyncIssue().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 
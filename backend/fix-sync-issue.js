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
 * Fix the synchronization issue between Firestore and PostgreSQL
 * Specifically for agent agentedos@creditplan.it with aimedici lead source
 */
async function fixSyncIssue() {
  // Use transaction to ensure consistency
  const transaction = await sequelize.transaction();
  
  try {
    console.log('========== FIXING SYNC ISSUE ==========');
    
    // 1. Find the agent in PostgreSQL
    console.log('\n1. Finding agent in PostgreSQL...');
    const agentInPg = await Agent.findOne({
      where: { email: 'agentedos@creditplan.it' },
      include: [{ model: AgentLeadSource }],
      transaction
    });
    
    if (!agentInPg) {
      throw new Error('Agent not found in PostgreSQL');
    }
    
    console.log(`Found agent in PostgreSQL: ${agentInPg.firstName} ${agentInPg.lastName} (${agentInPg.email})`);
    console.log(`Firebase UID: ${agentInPg.firebaseUid}`);
    
    // Get current lead sources in PostgreSQL
    const currentPgSources = agentInPg.AgentLeadSources.map(source => source.source);
    console.log(`Current PostgreSQL lead sources: ${JSON.stringify(currentPgSources)}`);
    
    // 2. Find the agent in Firestore
    console.log('\n2. Finding agent in Firestore...');
    const agentsSnapshot = await db.collection('agents')
      .where('email', '==', 'agentedos@creditplan.it')
      .get();
    
    if (agentsSnapshot.empty) {
      throw new Error('Agent not found in Firestore');
    }
    
    const firestoreAgent = {
      docRef: agentsSnapshot.docs[0].ref,
      id: agentsSnapshot.docs[0].id,
      data: agentsSnapshot.docs[0].data()
    };
    
    console.log(`Found agent in Firestore with ID: ${firestoreAgent.id}`);
    console.log(`Firebase UID: ${firestoreAgent.data.uid}`);
    
    // Get current lead sources in Firestore
    const currentFirestoreSources = Array.isArray(firestoreAgent.data.leadSources) 
      ? firestoreAgent.data.leadSources 
      : [];
    
    console.log(`Current Firestore lead sources: ${JSON.stringify(currentFirestoreSources)}`);
    
    // 3. Ensure both have the aimedici source (and maintain existing sources)
    console.log('\n3. Ensuring both databases have the correct lead sources...');
    
    // Check if the UIDs match
    if (agentInPg.firebaseUid !== firestoreAgent.data.uid) {
      console.log('⚠️ WARNING: Firebase UIDs do not match between PostgreSQL and Firestore!');
      console.log(`PostgreSQL: ${agentInPg.firebaseUid}`);
      console.log(`Firestore: ${firestoreAgent.data.uid}`);
      
      // Fix the UID in PostgreSQL to match Firestore
      console.log('Updating the Firebase UID in PostgreSQL to match Firestore...');
      await agentInPg.update({ firebaseUid: firestoreAgent.data.uid }, { transaction });
    }
    
    // Define the sources we want to ensure are present
    const requiredSources = ['aiquinto', 'aimedici'];
    const currentSources = new Set([...currentFirestoreSources, ...currentPgSources]);
    
    // Ensure required sources are in the set
    for (const source of requiredSources) {
      currentSources.add(source);
    }
    
    const updatedSources = [...currentSources];
    
    // 4. Update Firestore first
    console.log('\n4. Updating agent in Firestore...');
    console.log(`New lead sources: ${JSON.stringify(updatedSources)}`);
    
    await firestoreAgent.docRef.update({
      leadSources: updatedSources
    });
    
    console.log('✅ Firestore updated successfully');
    
    // 5. Force sync to PostgreSQL
    console.log('\n5. Force syncing to PostgreSQL...');
    
    // Remove existing lead sources
    await AgentLeadSource.destroy({
      where: { agentId: agentInPg.id },
      transaction
    });
    
    // Add updated lead sources
    for (const source of updatedSources) {
      await AgentLeadSource.create({
        agentId: agentInPg.id,
        source
      }, { transaction });
    }
    
    console.log('✅ PostgreSQL updated successfully');
    
    // 6. Verify the changes
    console.log('\n6. Verifying changes...');
    
    // Re-fetch from PostgreSQL
    const updatedAgentPg = await Agent.findOne({
      where: { id: agentInPg.id },
      include: [{ model: AgentLeadSource }],
      transaction
    });
    
    const pgSources = updatedAgentPg.AgentLeadSources.map(source => source.source);
    console.log(`Updated PostgreSQL sources: ${JSON.stringify(pgSources)}`);
    
    // Re-fetch from Firestore
    const updatedAgentDoc = await firestoreAgent.docRef.get();
    const fsData = updatedAgentDoc.data();
    console.log(`Updated Firestore sources: ${JSON.stringify(fsData.leadSources)}`);
    
    // Check for aimedici source in both
    const hasPgAiMedici = pgSources.includes('aimedici');
    const hasFsAiMedici = fsData.leadSources.includes('aimedici');
    
    if (hasPgAiMedici && hasFsAiMedici) {
      console.log('\n✅ SUCCESS: aimedici source is now present in both databases!');
    } else {
      console.log('\n❌ ERROR: aimedici source is still missing:');
      console.log(`PostgreSQL: ${hasPgAiMedici ? 'Present' : 'Missing'}`);
      console.log(`Firestore: ${hasFsAiMedici ? 'Present' : 'Missing'}`);
    }
    
    // 7. Force a final sync through the sync service
    console.log('\n7. Final sync through the standard sync service...');
    const syncModule = await import('./services/syncService.js');
    await syncModule.syncAgentFromFirestore(firestoreAgent.id, fsData);
    
    // Commit the transaction
    await transaction.commit();
    
    console.log('\n========== SYNC ISSUE FIXED ==========');
    
  } catch (error) {
    // Rollback in case of error
    await transaction.rollback();
    console.error('Error fixing sync issue:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the fix function
fixSyncIssue().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 
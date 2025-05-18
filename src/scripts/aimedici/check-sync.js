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
 * Fix Matias Galliani's lead sources sync issue
 */
async function fixMatiasSync() {
  const email = 'matiasgalliani00@gmail.com';
  const transaction = await sequelize.transaction();
  
  try {
    console.log(`Checking sync for ${email}...`);
    
    // 1. Find the agent in PostgreSQL
    console.log('\n1. Finding agent in PostgreSQL...');
    const agentInPg = await Agent.findOne({
      where: { email },
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
      .where('email', '==', email)
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
    console.log('Firestore Agent Data:', firestoreAgent.data);
    
    // Get current lead sources in Firestore
    const currentFirestoreSources = Array.isArray(firestoreAgent.data.leadSources) 
      ? firestoreAgent.data.leadSources 
      : [];
    
    console.log(`Current Firestore lead sources: ${JSON.stringify(currentFirestoreSources)}`);
    console.log(`Current Firestore pages: ${JSON.stringify(firestoreAgent.data.pages || [])}`);
    
    // 3. Check if UIDs match
    if (agentInPg.firebaseUid !== firestoreAgent.data.uid) {
      console.log('⚠️ WARNING: Firebase UIDs do not match between PostgreSQL and Firestore!');
      console.log(`PostgreSQL: ${agentInPg.firebaseUid}`);
      console.log(`Firestore: ${firestoreAgent.data.uid}`);
      
      // Fix the UID in PostgreSQL to match Firestore
      console.log('Updating the Firebase UID in PostgreSQL to match Firestore...');
      await agentInPg.update({ firebaseUid: firestoreAgent.data.uid }, { transaction });
      console.log('✅ Updated Firebase UID in PostgreSQL');
    } else {
      console.log('✅ Firebase UIDs match between PostgreSQL and Firestore');
    }
    
    // 4. Check if aimedici is in Firestore but not in PostgreSQL
    if (
      (firestoreAgent.data.pages && firestoreAgent.data.pages.includes('aimedici')) ||
      (firestoreAgent.data.leadSources && firestoreAgent.data.leadSources.includes('aimedici'))
    ) {
      if (!currentPgSources.includes('aimedici')) {
        console.log('\n⚠️ Agent has aimedici in Firestore but not in PostgreSQL');
        console.log('Adding aimedici to PostgreSQL...');
        
        // Add aimedici to PostgreSQL
        await AgentLeadSource.create({
          agentId: agentInPg.id,
          source: 'aimedici'
        }, { transaction });
        
        console.log('✅ aimedici added to PostgreSQL');
      } else {
        console.log('\n✅ aimedici is correctly in both Firestore and PostgreSQL');
      }
    } else if (currentPgSources.includes('aimedici')) {
      console.log('\n⚠️ Agent has aimedici in PostgreSQL but not in Firestore');
      
      // Ensure Firestore has the correct data
      const updatedFirestoreData = {
        ...firestoreAgent.data
      };
      
      // Ensure leadSources array exists and has aimedici
      if (!Array.isArray(updatedFirestoreData.leadSources)) {
        updatedFirestoreData.leadSources = [];
      }
      if (!updatedFirestoreData.leadSources.includes('aimedici')) {
        updatedFirestoreData.leadSources.push('aimedici');
      }
      
      // Ensure pages array exists and has aimedici
      if (!Array.isArray(updatedFirestoreData.pages)) {
        updatedFirestoreData.pages = [];
      }
      if (!updatedFirestoreData.pages.includes('aimedici')) {
        updatedFirestoreData.pages.push('aimedici');
      }
      
      console.log('Updating Firestore with correct lead sources and pages...');
      await firestoreAgent.docRef.update({
        leadSources: updatedFirestoreData.leadSources,
        pages: updatedFirestoreData.pages
      });
      
      console.log('✅ Firestore updated');
    } else {
      console.log('\n❓ aimedici is not present in either database');
      
      // Ask if we should add it
      console.log('Adding aimedici to both databases to ensure proper configuration...');
      
      // Update Firestore
      const updatedFirestoreData = {
        ...firestoreAgent.data
      };
      
      // Ensure leadSources array exists and has aimedici
      if (!Array.isArray(updatedFirestoreData.leadSources)) {
        updatedFirestoreData.leadSources = [];
      }
      if (!updatedFirestoreData.leadSources.includes('aimedici')) {
        updatedFirestoreData.leadSources.push('aimedici');
      }
      
      // Ensure pages array exists and has aimedici
      if (!Array.isArray(updatedFirestoreData.pages)) {
        updatedFirestoreData.pages = [];
      }
      if (!updatedFirestoreData.pages.includes('aimedici')) {
        updatedFirestoreData.pages.push('aimedici');
      }
      
      console.log('Updating Firestore with aimedici lead source and page...');
      await firestoreAgent.docRef.update({
        leadSources: updatedFirestoreData.leadSources,
        pages: updatedFirestoreData.pages
      });
      
      // Add to PostgreSQL
      await AgentLeadSource.create({
        agentId: agentInPg.id,
        source: 'aimedici'
      }, { transaction });
      
      console.log('✅ aimedici added to both databases');
    }
    
    // 5. Verify final state
    console.log('\n5. Verifying final state...');
    
    // Get updated PostgreSQL data
    const updatedAgentPg = await Agent.findOne({
      where: { email },
      include: [{ model: AgentLeadSource }],
      transaction
    });
    
    const updatedPgSources = updatedAgentPg.AgentLeadSources.map(source => source.source);
    console.log(`Updated PostgreSQL sources: ${JSON.stringify(updatedPgSources)}`);
    
    // Get updated Firestore data
    const updatedDoc = await firestoreAgent.docRef.get();
    const updatedFirestoreData = updatedDoc.data();
    
    const updatedFsSources = Array.isArray(updatedFirestoreData.leadSources) 
      ? updatedFirestoreData.leadSources 
      : [];
    
    console.log(`Updated Firestore sources: ${JSON.stringify(updatedFsSources)}`);
    console.log(`Updated Firestore pages: ${JSON.stringify(updatedFirestoreData.pages || [])}`);
    
    // Check if aimedici is in both databases now
    const hasAimediciInPg = updatedPgSources.includes('aimedici');
    const hasAimediciInFs = updatedFsSources.includes('aimedici');
    
    if (hasAimediciInPg && hasAimediciInFs) {
      console.log('\n✅ SUCCESS: aimedici is now correctly configured in both databases!');
    } else {
      console.log('\n❌ ERROR: aimedici is still missing in some database:');
      console.log(`PostgreSQL: ${hasAimediciInPg ? 'Present' : 'Missing'}`);
      console.log(`Firestore: ${hasAimediciInFs ? 'Present' : 'Missing'}`);
    }
    
    // Commit the transaction
    await transaction.commit();
    
    // 6. Force final sync through syncService
    console.log('\n6. Forcing final sync through syncService...');
    const syncModule = await import('./services/syncService.js');
    await syncModule.syncAgentFromFirestore(firestoreAgent.id, updatedFirestoreData);
    
    console.log('\n✅ FIX COMPLETE');
    
  } catch (error) {
    // Rollback in case of error
    await transaction.rollback();
    console.error('Error fixing sync issue:', error);
  } finally {
    // Close the database connection if not already closed by rollback/commit
    if (sequelize && !transaction.finished) {
      await sequelize.close();
    }
  }
}

// Run the function
fixMatiasSync().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 
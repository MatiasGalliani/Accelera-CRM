import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { Agent, AgentLeadSource, Lead, LeadNote, LeadStatusHistory } from './models/leads-index.js';
import sequelize from './config/database.js';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();

/**
 * Clean up agents that exist in PostgreSQL but not in Firestore
 */
async function cleanDeletedAgents() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('========== CLEANING DELETED AGENTS ==========');
    
    // 1. Get all agents from Firestore
    console.log('\n1. Getting all agents from Firestore...');
    const fsAgentsSnapshot = await db.collection('agents').get();
    
    // Create a map of Firebase UIDs for quick lookup
    const firestoreUids = new Set();
    fsAgentsSnapshot.forEach(doc => {
      const data = doc.data();
      firestoreUids.add(data.uid);
    });
    
    console.log(`Found ${firestoreUids.size} agents in Firestore`);
    
    // 2. Get all agents from PostgreSQL
    console.log('\n2. Getting all agents from PostgreSQL...');
    const pgAgents = await Agent.findAll({
      include: [{ model: AgentLeadSource }],
      transaction
    });
    
    console.log(`Found ${pgAgents.length} agents in PostgreSQL`);
    
    // 3. Find agents in PostgreSQL that don't exist in Firestore
    console.log('\n3. Finding agents to delete...');
    const agentsToDelete = pgAgents.filter(agent => !firestoreUids.has(agent.firebaseUid));
    
    console.log(`Found ${agentsToDelete.length} agents to delete in PostgreSQL`);
    
    if (agentsToDelete.length === 0) {
      console.log('No agents to delete. All PostgreSQL agents exist in Firestore.');
      await transaction.commit();
      return;
    }
    
    // 4. Confirm deletion
    console.log('\nAgents to be deleted:');
    agentsToDelete.forEach(agent => {
      console.log(`- ID: ${agent.id}, Firebase UID: ${agent.firebaseUid}, Email: ${agent.email}, Name: ${agent.firstName} ${agent.lastName}`);
    });
    
    // 5. Delete agents
    console.log('\n4. Deleting agents from PostgreSQL...');
    
    for (const agent of agentsToDelete) {
      const agentId = agent.id;
      console.log(`\nProcessing agent: ${agent.email} (ID: ${agentId})...`);
      
      // 5.1 Delete lead status history records
      console.log(`- Deleting lead status history records for agent ${agentId}...`);
      await LeadStatusHistory.destroy({
        where: { agentId },
        transaction
      });
      
      // 5.2 Delete lead notes
      console.log(`- Deleting lead notes for agent ${agentId}...`);
      await LeadNote.destroy({
        where: { agentId },
        transaction
      });
      
      // 5.3 Reassign or set to null any leads assigned to this agent
      console.log(`- Updating leads for agent ${agentId}...`);
      await Lead.update(
        { assignedAgentId: null },
        { 
          where: { assignedAgentId: agentId },
          transaction
        }
      );
      
      // 5.4 Delete lead sources
      console.log(`- Deleting lead sources for agent ${agentId}...`);
      await AgentLeadSource.destroy({
        where: { agentId },
        transaction
      });
      
      // 5.5 Finally delete the agent
      console.log(`- Deleting agent ${agentId}...`);
      await agent.destroy({ transaction });
      
      console.log(`✅ Successfully deleted agent: ${agent.email}`);
    }
    
    console.log(`\n✅ Successfully deleted ${agentsToDelete.length} agents from PostgreSQL`);
    
    // 6. Reassign leads that are now unassigned to active agents
    console.log('\n5. Reassigning orphaned leads...');
    const orphanedLeads = await Lead.count({
      where: { assignedAgentId: null },
      transaction
    });
    
    console.log(`Found ${orphanedLeads} leads without an assigned agent.`);
    console.log(`These will be automatically assigned by the round robin on the next assignment attempt.`);
    
    // Commit the transaction
    await transaction.commit();
    
    console.log('\nDone! Agents have been cleaned up.');
    
  } catch (error) {
    console.error('\n❌ Error cleaning agents:', error);
    await transaction.rollback();
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the function
cleanDeletedAgents()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  }); 
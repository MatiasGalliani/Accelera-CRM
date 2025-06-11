import admin from 'firebase-admin';
import { Agent, AgentLeadSource, AgentPage } from '../models/leads-index.js';
import sequelize from '../config/database.js';
import serviceAccount from '../config/firebaseServiceAccountKey.json' assert { type: 'json' };

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const emailsToDelete = ['prueba1@gmail.com', 'prueba2@gmail.com'];

async function deleteFirebaseUsers() {
  try {
    // Fetch all users from Firebase Auth
    let nextPageToken;
    let usersToDelete = [];
    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
      usersToDelete.push(...listUsersResult.users.filter(user => emailsToDelete.includes(user.email)));
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    for (const user of usersToDelete) {
      try {
        // Delete from Auth
        await admin.auth().deleteUser(user.uid);
        console.log(`Deleted user from Firebase Auth: ${user.email}`);
        // Delete from Firestore (if you store user docs by uid)
        await admin.firestore().collection('users').doc(user.uid).delete();
        console.log(`Deleted user document from Firestore: ${user.email}`);
      } catch (err) {
        console.error(`Error deleting user ${user.email}:`, err);
      }
    }
    if (usersToDelete.length === 0) {
      console.log('No matching users found in Firebase Auth.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error during Firebase user cleanup:', err);
    process.exit(1);
  }
}

async function cleanupSpecificAgents() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Starting cleanup of specific agents...');

    // Find the specific agents
    const agentsToDelete = await Agent.findAll({
      where: {
        email: ['prueba1@gmail.com', 'prueba2@gmail.com']
      }
    });

    console.log(`Found ${agentsToDelete.length} agents to delete`);

    // Delete the agents
    for (const agent of agentsToDelete) {
      try {
        console.log(`Deleting agent: ${agent.email} (ID: ${agent.id})`);
        
        // Delete related data first
        await AgentLeadSource.destroy({
          where: { agentId: agent.id },
          transaction
        });
        console.log(`Deleted lead sources for agent ${agent.id}`);
        
        await AgentPage.destroy({
          where: { agentId: agent.id },
          transaction
        });
        console.log(`Deleted page permissions for agent ${agent.id}`);
        
        // Finally delete the agent
        await agent.destroy({ transaction });
        console.log(`Deleted PostgreSQL agent record ${agent.id}`);
      } catch (error) {
        console.error(`Error deleting agent ${agent.email}:`, error);
      }
    }

    // Commit the transaction
    await transaction.commit();
    console.log('Cleanup completed successfully');
  } catch (error) {
    // Rollback the transaction on error
    await transaction.rollback();
    console.error('Error during cleanup:', error);
  } finally {
    deleteFirebaseUsers();
  }
}

cleanupSpecificAgents(); 
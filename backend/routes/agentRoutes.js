import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { Agent, AgentLeadSource, AgentPage } from '../models/leads-index.js';
import admin from 'firebase-admin';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';

const router = express.Router();

// GET /api/agents - Get all agents (admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const agentsSnapshot = await admin.firestore().collection('agents').get();
    const agents = agentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json(agents);
  } catch (err) {
    console.error('Error fetching agents:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/agents - Create a new agent
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { email, password, firstName, lastName, role, phone, calendlyUrl } = req.body;

  const transaction = await Agent.sequelize.transaction();
  try {
    console.log(`Creating new agent: ${email} with role: ${role}`);
    
    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
    });
    
    console.log(`Firebase user created with UID: ${userRecord.uid}`);

    // Store agent data in Firestore
    const agentRef = await admin.firestore().collection('agents').add({
      uid: userRecord.uid,
      email,
      firstName,
      lastName,
      role,
      phone: phone || null,
      calendlyUrl: calendlyUrl || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Firestore agent record created with ID: ${agentRef.id}`);

    // Create agent in PostgreSQL
    const newAgent = await Agent.create({
      firebaseUid: userRecord.uid,
      email,
      firstName,
      lastName,
      role,
      phone: phone || null,
      calendlyUrl: calendlyUrl || null,
      isActive: true
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      id: agentRef.id,
      uid: userRecord.uid,
      email,
      firstName,
      lastName,
      role,
      phone: phone || null,
      calendlyUrl: calendlyUrl || null,
      dbId: newAgent.id
    });
  } catch (err) {
    await transaction.rollback();
    console.error('Error creating agent:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/agents/:id - Get a specific agent
router.get('/:id', authenticate, async (req, res) => {
  try {
    const agent = await Agent.findByPk(req.params.id, {
      include: [{ model: AgentLeadSource }]
    });
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json(agent);
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// DELETE /api/agents/:id - Delete an agent
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  let transaction;
  
  try {
    transaction = await sequelize.transaction();
    const agentId = req.params.id;
    console.log(`Starting complete deletion of agent ${agentId}`);
    
    // 1. Get the agent document from Firestore
    const agentDoc = await admin.firestore().collection('agents').doc(agentId).get();
    
    if (!agentDoc.exists) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Agente non trovato' });
    }

    const agentData = agentDoc.data();
    console.log(`Found agent data:`, agentData);
    
    // 2. Delete from Firebase Auth
    try {
      if (agentData.uid) {
        await admin.auth().deleteUser(agentData.uid);
        console.log(`Firebase Auth user ${agentData.uid} deleted successfully`);
      } else {
        console.log('No Firebase UID found for this agent');
      }
    } catch (firebaseError) {
      console.error('Error deleting Firebase Auth user:', firebaseError);
      // If the user doesn't exist in Firebase Auth, that's okay - continue with other deletions
      if (firebaseError.code !== 'auth/user-not-found') {
        await transaction.rollback();
        throw firebaseError;
      }
    }
    
    // 3. Delete from Firestore
    try {
      await admin.firestore().collection('agents').doc(agentId).delete();
      console.log(`Firestore agent document ${agentId} deleted successfully`);
    } catch (firestoreError) {
      console.error('Error deleting from Firestore:', firestoreError);
      await transaction.rollback();
      throw firestoreError;
    }
    
    // 4. Delete from PostgreSQL and related tables
    try {
      // First find the agent in PostgreSQL by both ID and Firebase UID
      const pgAgent = await Agent.findOne({
        where: {
          [Op.or]: [
            { firebaseUid: agentData.uid },
            { id: agentId }
          ]
        },
        transaction
      });
      
      if (pgAgent) {
        // Delete related data first
        await AgentLeadSource.destroy({
          where: { agentId: pgAgent.id },
          transaction
        });
        console.log(`Deleted lead sources for agent ${pgAgent.id}`);
        
        await AgentPage.destroy({
          where: { agentId: pgAgent.id },
          transaction
        });
        console.log(`Deleted page permissions for agent ${pgAgent.id}`);
        
        // Finally delete the agent
        await pgAgent.destroy({ transaction });
        console.log(`Deleted PostgreSQL agent record ${pgAgent.id}`);
      } else {
        console.log(`No PostgreSQL record found for agent ${agentId}`);
      }
      
      // Commit the transaction
      await transaction.commit();
      
      res.status(200).json({ 
        message: 'Agente eliminato con successo da tutti i sistemi',
        deletedFrom: {
          firebaseAuth: true,
          firestore: true,
          postgresql: !!pgAgent
        }
      });
    } catch (dbError) {
      console.error('Error in database operations:', dbError);
      await transaction.rollback();
      throw dbError;
    }
  } catch (err) {
    // Rollback the transaction on error
    if (transaction) {
      await transaction.rollback();
    }
    console.error('Error in complete agent deletion:', err);
    res.status(500).json({ 
      message: 'Errore durante l\'eliminazione dell\'agente',
      error: err.message
    });
  }
});

// DELETE /api/agents/:id/firebase - Delete Firebase Auth user
router.delete('/:id/firebase', authenticate, requireAdmin, async (req, res) => {
  try {
    const agentId = req.params.id;
    
    // Get the agent document to find the Firebase UID
    const agentDoc = await admin.firestore().collection('agents').doc(agentId).get();
    
    if (!agentDoc.exists) {
      return res.status(404).json({ message: 'Agente non trovato' });
    }
    
    const agentData = agentDoc.data();
    
    // Delete the user from Firebase Auth
    await admin.auth().deleteUser(agentData.uid);
    
    res.status(200).json({ message: 'Utente Firebase eliminato' });
  } catch (err) {
    console.error('Error deleting Firebase user:', err);
    res.status(500).json({ message: 'Errore durante l\'eliminazione dell\'utente Firebase' });
  }
});

// DELETE /api/agents/firebase-user/:uid - Delete Firebase Auth user directly by UID
router.delete('/firebase-user/:uid', authenticate, requireAdmin, async (req, res) => {
  try {
    const uid = req.params.uid;
    console.log(`Attempting to delete Firebase user with UID: ${uid}`);
    
    // Check if the requester is trying to delete themselves
    if (req.user.uid === uid) {
      console.error('User attempted to delete their own account');
      return res.status(403).json({ message: 'Non puoi eliminare il tuo account' });
    }
    
    try {
      // Delete the user from Firebase Auth
      await admin.auth().deleteUser(uid);
      console.log(`Firebase user ${uid} deleted successfully`);
      
      // Check if there's also a Firestore document for this user and delete it
      const agentsSnapshot = await admin.firestore().collection('agents')
        .where('uid', '==', uid)
        .get();
      
      if (!agentsSnapshot.empty) {
        // Delete all matching Firestore documents
        const deletePromises = agentsSnapshot.docs.map(doc => {
          console.log(`Deleting Firestore agent document ${doc.id} for user ${uid}`);
          return doc.ref.delete();
        });
        
        await Promise.all(deletePromises);
        console.log(`Deleted ${deletePromises.length} Firestore documents for user ${uid}`);
      }
      
      res.status(200).json({ message: 'Utente Firebase eliminato con successo' });
    } catch (deleteError) {
      console.error(`Error deleting Firebase user ${uid}:`, deleteError);
      
      // Check for specific Firebase error codes
      if (deleteError.code === 'auth/user-not-found') {
        return res.status(404).json({ message: 'Utente non trovato in Firebase' });
      }
      
      throw deleteError; // Rethrow to be caught by outer catch
    }
  } catch (err) {
    console.error('Error in firebase-user deletion endpoint:', err);
    res.status(500).json({ 
      message: 'Errore durante l\'eliminazione dell\'utente Firebase',
      error: err.message || 'Unknown error'
    });
  }
});

// PUT /api/agents/:id/lead-sources - Update an agent's lead sources
router.put('/:id/lead-sources', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { leadSources } = req.body;
    
    if (!Array.isArray(leadSources)) {
      return res.status(400).json({ error: 'leadSources must be an array' });
    }
    
    const agent = await Agent.findByPk(id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Update lead sources
    await AgentLeadSource.destroy({ where: { agentId: id } });
    await Promise.all(
      leadSources.map(source => 
        AgentLeadSource.create({ agentId: id, source })
      )
    );
    
    res.json({ message: 'Lead sources updated successfully' });
  } catch (error) {
    console.error('Error updating lead sources:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// PUT /api/agents/:id/pages - Update an agent's pages (permissions)
router.put('/:id/pages', authenticate, requireAdmin, async (req, res) => {
  try {
    const agentId = req.params.id;
    const { pages } = req.body;
    
    if (!Array.isArray(pages)) {
      return res.status(400).json({ message: 'pages debe ser un array' });
    }
    
    // Get the agent document
    const agentDoc = await admin.firestore().collection('agents').doc(agentId).get();
    
    if (!agentDoc.exists) {
      return res.status(404).json({ message: 'Agente non trovato' });
    }
    
    // UPDATE: Update both pages and leadSources to ensure round-robin consistency
    await admin.firestore().collection('agents').doc(agentId).update({
      pages: pages,
      leadSources: pages, // Sync leadSources with pages to fix round-robin assignment
      // For backwards compatibility
      page: pages[0] || "aiquinto"
    });
    
    console.log(`Updated agent ${agentId} with pages and leadSources:`, pages);
    
    // Sync with PostgreSQL
    const syncService = await import('../services/syncService.js');
    await syncService.syncAgentFromFirestore(agentId, {
      ...agentDoc.data(),
      pages: pages,
      leadSources: pages // Also pass the updated leadSources for sync
    });
    
    res.json({ 
      message: 'Page permissions and lead sources updated',
      agentId,
      pages,
      leadSources: pages
    });
  } catch (err) {
    console.error('Error updating page permissions:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/agents/:uid/password - Change user password
router.post('/:uid/password', authenticate, requireAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const { password } = req.body;

    if (!password) {
      console.error('No password provided in request');
      return res.status(400).json({ error: 'Password is required' });
    }

    console.log(`Attempting to change password for user ${uid}`);

    // Update the password in Firebase Auth
    await admin.auth().updateUser(uid, {
      password: password
    });

    console.log(`Password updated successfully for user ${uid}`);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    // Check for specific Firebase Auth errors
    if (error.code === 'auth/invalid-password') {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

export default router; 
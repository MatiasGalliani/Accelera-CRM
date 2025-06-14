import express from 'express';
import { authenticate, requireAdmin, requireAuth } from '../middleware/auth.js';
import { Agent, AgentLeadSource, AgentPage } from '../models/leads-index.js';
import admin from '../config/firebase-admin.js';
import { checkIsAdmin } from '../middleware/auth.js';

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
  const { email, password, firstName, lastName, role, pages = ['aiquinto'] } = req.body;
  let userRecord = null;

  try {
    console.log(`Creating new agent: ${email} with role: ${role}`);
    
    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        details: {
          email: !email,
          password: !password,
          firstName: !firstName,
          lastName: !lastName,
          role: !role
        }
      });
    }

    // Create user in Firebase Auth
    try {
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: `${firstName} ${lastName}`,
      });
      console.log(`Firebase user created with UID: ${userRecord.uid}`);
    } catch (authError) {
      console.error('Firebase Auth error:', authError);
      return res.status(400).json({ 
        message: 'Error creating Firebase user',
        error: authError.message
      });
    }

    // Store agent data in Firestore with initial pages
    try {
      const agentRef = await admin.firestore().collection('agents').add({
        uid: userRecord.uid,
        email,
        firstName,
        lastName,
        role,
        pages: pages,
        leadSources: pages, // Sync leadSources with pages for round-robin
        page: pages[0] || "aiquinto", // For backwards compatibility
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Firestore agent record created with ID: ${agentRef.id}`);
      
      // Double-check that the agent document was created with the correct UID
      const agentDoc = await agentRef.get();
      if (!agentDoc.exists) {
        throw new Error('Failed to verify agent document after creation');
      }
      
      console.log(`Agent document verified: ${JSON.stringify(agentDoc.data())}`);

      const newAgent = {
        id: agentRef.id,
        uid: userRecord.uid,
        email,
        firstName,
        lastName,
        role,
        pages: pages
      };
      
      // If the agent is created with admin role, log that clearly
      if (role === 'admin') {
        console.log(`NEW ADMIN ACCOUNT CREATED: ${email} (${userRecord.uid})`);
      }

      res.status(201).json(newAgent);
    } catch (firestoreError) {
      console.error('Firestore error:', firestoreError);
      // Clean up Firebase user if Firestore creation failed
      if (userRecord) {
        try {
          await admin.auth().deleteUser(userRecord.uid);
          console.log(`Cleaned up Firebase user ${userRecord.uid} after Firestore error`);
        } catch (cleanupError) {
          console.error('Error cleaning up Firebase user:', cleanupError);
        }
      }
      return res.status(500).json({ 
        message: 'Error creating agent in Firestore',
        error: firestoreError.message
      });
    }
  } catch (err) {
    console.error('Unexpected error in agent creation:', err);
    // Clean up Firebase user if it was created
    if (userRecord) {
      try {
        await admin.auth().deleteUser(userRecord.uid);
        console.log(`Cleaned up Firebase user ${userRecord.uid} after unexpected error`);
      } catch (cleanupError) {
        console.error('Error cleaning up Firebase user:', cleanupError);
      }
    }
    res.status(500).json({ 
      message: 'Unexpected error during agent creation',
      error: err.message
    });
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
  try {
    const agentId = req.params.id;
    const agentDoc = await admin.firestore().collection('agents').doc(agentId).get();
    
    if (!agentDoc.exists) {
      return res.status(404).json({ message: 'Agente non trovato' });
    }

    const agentData = agentDoc.data();
    
    // Delete from Firestore
    await admin.firestore().collection('agents').doc(agentId).delete();
    
    res.status(200).json({ message: 'Agente eliminato' });
  } catch (err) {
    console.error('Error deleting agent:', err);
    res.status(500).json({ message: 'Server error' });
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
router.put('/:id/pages', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { pages } = req.body;
    const uid = req.user.uid;

    if (!Array.isArray(pages)) {
      return res.status(400).json({ message: 'Pages must be an array' });
    }

    // Check if user is admin
    const isAdmin = await checkIsAdmin(uid);
    console.log('User is admin:', isAdmin);

    // Get agent document
    const agentDoc = await admin.firestore()
      .collection('agents')
      .doc(id)
      .get();

    if (!agentDoc.exists) {
      return res.status(404).json({ message: 'Agente non trovato' });
    }

    const agentData = agentDoc.data();

    // Check permissions
    if (!isAdmin && agentData.uid !== uid) {
      return res.status(403).json({ message: 'Non hai i permessi per modificare le pagine di questo agente' });
    }

    // Update Firestore document
    await admin.firestore()
      .collection('agents')
      .doc(id)
      .update({
        pages: pages,
        leadSources: pages // Keep leadSources in sync with pages
      });

    // Update PostgreSQL
    await AgentPage.destroy({ where: { agentId: id } });
    await Promise.all(pages.map(page => 
      AgentPage.create({
        agentId: id,
        pageId: page,
        canView: true,
        canEdit: true
      })
    ));

    console.log(`Updated pages for agent ${id}:`, pages);
    res.json({ message: 'Pagine aggiornate con successo' });
  } catch (error) {
    console.error('Error updating agent pages:', error);
    res.status(500).json({ message: 'Errore durante l\'aggiornamento delle pagine' });
  }
});

// Helper function to check if a user is admin
async function checkIsAdmin(uid) {
  try {
    // First check in Firestore
    const agentsSnapshot = await admin.firestore()
      .collection('agents')
      .where('uid', '==', uid)
      .limit(1)
      .get();

    if (!agentsSnapshot.empty) {
      const agentData = agentsSnapshot.docs[0].data();
      if (agentData.role === 'admin') {
        return true;
      }
    }

    // Then check in PostgreSQL
    const { Agent } = await import('../models/leads-index.js');
    const pgAgent = await Agent.findOne({ where: { firebaseUid: uid } });
    
    if (pgAgent && pgAgent.role === 'admin') {
      return true;
    }

    // Finally check hardcoded admin emails
    const userRecord = await admin.auth().getUser(uid);
    const adminEmails = ['it@creditplan.it', 'admin@creditplan.it'].map(email => email.toLowerCase());
    if (userRecord.email && adminEmails.includes(userRecord.email.toLowerCase())) {
      return true;
    }

    return false;
  } catch (err) {
    console.error('Error checking admin status:', err);
    return false;
  }
}

export default router; 
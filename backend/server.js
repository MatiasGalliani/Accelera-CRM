// server.js
import express from 'express';
import admin from 'firebase-admin';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { Client, Case } from './models/index.js';
import { Lead, LeadDetail } from './models/leads-index.js';
import sequelize from './config/database.js';
import syncService from './services/syncService.js';
import leadRoutes from './routes/leadRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import authRoutes from './routes/authRoutes.js';
import cors from 'cors';

// Load environment variables from .env file
dotenv.config();

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Replace literal \n in your private key string with actual newlines
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

// Initialize Firestore
const db = admin.firestore();

const app = express();
// Parse JSON bodies
app.use(bodyParser.json());
// Enable CORS
app.use(cors());

// Add API key verification middleware
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.WEBHOOK_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  next();
};

// Setup environment variable for webhook API key if not exists
if (!process.env.WEBHOOK_API_KEY) {
  console.warn('WEBHOOK_API_KEY not set in environment variables. Using default for development.');
  process.env.WEBHOOK_API_KEY = 'dev-api-key-123';
}

// Auth middleware to verify Firebase ID Tokens
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    console.error('No token provided');
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    console.log('Verifying token:', token.substring(0, 10) + '...');
    const decoded = await admin.auth().verifyIdToken(token);
    console.log('Token verified for user:', decoded.uid);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

// Admin role authorization middleware
async function requireAdmin(req, res, next) {
  try {
    const uid = req.user.uid;
    
    // Get user from Firestore to check role
    const agentsSnapshot = await db.collection('agents')
      .where('uid', '==', uid)
      .limit(1)
      .get();
    
    if (agentsSnapshot.empty) {
      console.error('User not found in Firestore:', uid);
      return res.status(403).json({ message: 'Accesso negato: richiede privilegi di amministratore' });
    }
    
    const agentData = agentsSnapshot.docs[0].data();
    
    if (agentData.role !== 'admin') {
      console.error('User is not an admin:', uid);
      return res.status(403).json({ message: 'Accesso negato: richiede privilegi di amministratore' });
    }
    
    // User is admin, proceed
    next();
  } catch (err) {
    console.error('Admin check error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// GET /api/agents - List all agents
app.get('/api/agents', authenticate, requireAdmin, async (req, res) => {
  try {
    const agentsSnapshot = await db.collection('agents').get();
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
app.post('/api/agents', authenticate, requireAdmin, async (req, res) => {
  const { email, password, firstName, lastName, role } = req.body;

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
    const agentRef = await db.collection('agents').add({
      uid: userRecord.uid,
      email,
      firstName,
      lastName,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Firestore agent record created with ID: ${agentRef.id}`);
    
    // Double-check that the agent document was created with the correct UID
    const agentDoc = await agentRef.get();
    if (agentDoc.exists) {
      console.log(`Agent document verified: ${JSON.stringify(agentDoc.data())}`);
    } else {
      console.error(`Failed to verify agent document after creation`);
    }

    const newAgent = {
      id: agentRef.id,
      uid: userRecord.uid,
      email,
      firstName,
      lastName,
      role
    };
    
    // If the agent is created with admin role, log that clearly
    if (role === 'admin') {
      console.log(`NEW ADMIN ACCOUNT CREATED: ${email} (${userRecord.uid})`);
    }

    res.status(201).json(newAgent);
  } catch (err) {
    console.error('Error creating agent:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/agents/:id - Delete an agent
app.delete('/api/agents/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const agentId = req.params.id;
    const agentDoc = await db.collection('agents').doc(agentId).get();
    
    if (!agentDoc.exists) {
      return res.status(404).json({ message: 'Agente non trovato' });
    }

    const agentData = agentDoc.data();
    
    // Delete from Firestore
    await db.collection('agents').doc(agentId).delete();
    
    res.status(200).json({ message: 'Agente eliminato' });
  } catch (err) {
    console.error('Error deleting agent:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/agents/:id/firebase - Delete Firebase Auth user
app.delete('/api/agents/:id/firebase', authenticate, requireAdmin, async (req, res) => {
  try {
    const agentId = req.params.id;
    
    // Get the agent document to find the Firebase UID
    const agentDoc = await db.collection('agents').doc(agentId).get();
    
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

// New endpoint: DELETE /api/agents/firebase-user/:uid - Delete Firebase Auth user directly by UID
app.delete('/api/agents/firebase-user/:uid', authenticate, requireAdmin, async (req, res) => {
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
      const agentsSnapshot = await db.collection('agents')
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

// GET /api/firebase-users - List all Firebase users
app.get('/api/firebase-users', authenticate, requireAdmin, async (req, res) => {
  try {
    // Verificamos que el usuario tenga rol de admin (opcional)
    const userRecord = req.user;
    
    // Lista para almacenar todos los usuarios
    const users = [];
    
    // Add rate limiting and pagination
    const fetchUsers = async (pageToken) => {
      try {
        // Reduced batch size to prevent timeouts
        const listUsersResult = await admin.auth().listUsers(100, pageToken);
        
        // Map only needed user data
        const mappedUsers = listUsersResult.users.map(userRecord => ({
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          photoURL: userRecord.photoURL,
          disabled: userRecord.disabled,
          emailVerified: userRecord.emailVerified,
          metadata: {
            creationTime: userRecord.metadata.creationTime,
            lastSignInTime: userRecord.metadata.lastSignInTime
          }
        }));
        
        users.push(...mappedUsers);
        
        // If there are more users, wait a bit before fetching next batch
        if (listUsersResult.pageToken) {
          // Add delay between batches to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          await fetchUsers(listUsersResult.pageToken);
        }
      } catch (error) {
        console.error('Error listing users batch:', error);
        throw error;
      }
    };
    
    // Start fetching users with improved error handling
    try {
      await fetchUsers();
      console.log(`Successfully retrieved ${users.length} Firebase users`);
      res.json(users);
    } catch (fetchError) {
      console.error('Error during user fetch process:', fetchError);
      // Check for specific Firebase errors
      if (fetchError.code === 'auth/internal-error') {
        res.status(500).json({ 
          message: 'Errore interno Firebase',
          error: fetchError.message 
        });
      } else if (fetchError.code === 'auth/invalid-argument') {
        res.status(400).json({ 
          message: 'Parametri non validi',
          error: fetchError.message 
        });
      } else {
        res.status(500).json({ 
          message: 'Errore durante il recupero degli utenti',
          error: fetchError.message 
        });
      }
    }
  } catch (error) {
    console.error('Error in /api/firebase-users:', error);
    res.status(500).json({ 
      message: 'Errore recupero utenti Firebase',
      error: error.message 
    });
  }
});

// POST /api/clients - Create new client(s) and their cases
app.post('/api/clients', authenticate, async (req, res) => {
  const { clients, type, products, agent } = req.body;

  try {
    // Start a transaction to ensure data consistency
    const result = await sequelize.transaction(async (t) => {
      const createdClients = [];
      const createdCases = [];

      // Create each client and their associated cases
      for (const clientData of clients) {
        // Check if client already exists
        let client = await Client.findOne({
          where: { email: clientData.email },
          transaction: t
        });

        // If client doesn't exist, create a new one
        if (!client) {
          client = await Client.create({
            firstName: clientData.firstName,
            lastName: clientData.lastName,
            email: clientData.email,
            phone: clientData.phone || null,
            address: clientData.address || null
          }, { transaction: t });
          console.log(`Created new client: ${client.firstName} ${client.lastName}`);
        } else {
          console.log(`Using existing client: ${client.firstName} ${client.lastName}`);
        }

        createdClients.push(client);

        // Create a case for each product
        for (const product of products) {
          const caseNumber = `CASE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          // Prepare case data without assignedAgentId to avoid data type issues
          const caseData = {
            caseNumber,
            title: product.title,
            description: `${product.title} - ${product.description}`,
            status: 'new',
            priority: 'medium',
            clientId: client.id
          };
          
          // Only add assignedAgentId if we have a valid numeric value
          // Firebase UIDs are strings, but our model expects integers
          if (req.user && req.user.agentId) {
            caseData.assignedAgentId = req.user.agentId;
          }
          
          const caseRecord = await Case.create(caseData, { transaction: t });
          createdCases.push(caseRecord);
        }
      }

      return { clients: createdClients, cases: createdCases };
    });

    res.status(201).json({
      message: 'Clients and cases created successfully',
      data: result
    });
  } catch (err) {
    console.error('Error creating clients and cases:', err);
    res.status(500).json({ 
      message: 'Error creating clients and cases',
      error: err.message 
    });
  }
});

// GET /api/cases - List all cases with associated clients
app.get('/api/cases', authenticate, async (req, res) => {
  try {
    // Get all cases with their associated client data
    const cases = await Case.findAll({
      include: [
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['created_at', 'DESC']] // Most recent cases first
    });

    // Group cases by client to aggregate products
    const clientCases = {};
    
    cases.forEach(caseItem => {
      const caseData = caseItem.get({ plain: true });
      const clientId = caseData.client.id;
      
      if (!clientCases[clientId]) {
        clientCases[clientId] = {
          id: caseData.id,
          clients: [caseData.client],
          products: [],
          // We don't have type stored, assume 'privato'
          type: 'privato',
          // Use Firebase user's display name, fallback to UID
          agent: req.user.name || req.user.email || req.user.uid || 'Agente'
        };
      }
      
      // Extract the product description correctly
      // The format is typically "Title - Description"
      let productTitle = caseData.title;
      let productDescription = '';
      
      if (caseData.description && caseData.description.includes(' - ')) {
        // If description contains "Title - Description" format, extract just the description part
        productDescription = caseData.description.split(' - ')[1];
      } else {
        // Otherwise use the full description
        productDescription = caseData.description || '';
      }
      
      // Add product info from the case
      clientCases[clientId].products.push({
        title: productTitle,
        description: productDescription
      });
    });

    // Convert to array for response
    const formattedCases = Object.values(clientCases);

    res.json(formattedCases);
  } catch (err) {
    console.error('Error fetching cases:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/cases/:id - Delete a case
app.delete('/api/cases/:id', authenticate, async (req, res) => {
  try {
    const caseId = req.params.id;
    
    // Check if the case exists
    const caseToDelete = await Case.findByPk(caseId);
    
    if (!caseToDelete) {
      return res.status(404).json({ message: 'Caso non trovato' });
    }
    
    // Delete the case
    await caseToDelete.destroy();
    
    res.status(200).json({ message: 'Caso eliminato con successo' });
  } catch (err) {
    console.error('Error deleting case:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Endpoint for creating an admin quickly (DEVELOPMENT AND PRODUCTION USE)
app.get('/api/create-admin/:email', authenticate, async (req, res) => {
  try {
    const email = req.params.email;
    if (!email) {
      return res.status(400).json({ message: 'Email required' });
    }
    
    console.log(`Attempting to set admin role for email: ${email}`);
    
    // Find the user by email
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('Found user record:', userRecord.uid);
    } catch (error) {
      console.error('Error finding user by email:', error);
      return res.status(404).json({ message: 'User not found', error: error.message });
    }
    
    // Check if the user already exists in the agents collection
    const agentsSnapshot = await db.collection('agents')
      .where('email', '==', email)
      .get();
    
    if (!agentsSnapshot.empty) {
      // Update the role to admin in the existing document and ensure UID is correct
      console.log('Agent document exists, updating to admin role and ensuring UID is correct');
      const agentDoc = agentsSnapshot.docs[0];
      await agentDoc.ref.update({ 
        role: 'admin',
        uid: userRecord.uid // Ensure UID is correct
      });
      
      console.log('Agent updated successfully to admin with UID:', userRecord.uid);
      return res.status(200).json({ 
        message: 'User updated to admin',
        agent: {
          id: agentDoc.id,
          ...agentDoc.data(),
          role: 'admin',
          uid: userRecord.uid
        }
      });
    }
    
    // If user doesn't exist in agents collection, create a new document
    console.log('Creating new agent document with admin role');
    const newAgentRef = await db.collection('agents').add({
      uid: userRecord.uid,
      email: userRecord.email,
      firstName: userRecord.displayName ? userRecord.displayName.split(' ')[0] : 'Admin',
      lastName: userRecord.displayName ? userRecord.displayName.split(' ').slice(1).join(' ') : 'User',
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Verify the document was created properly
    const newAgentDoc = await newAgentRef.get();
    console.log('New admin document created with data:', newAgentDoc.data());
    
    const newAgent = {
      id: newAgentRef.id,
      uid: userRecord.uid,
      email: userRecord.email,
      firstName: userRecord.displayName ? userRecord.displayName.split(' ')[0] : 'Admin',
      lastName: userRecord.displayName ? userRecord.displayName.split(' ').slice(1).join(' ') : 'User',
      role: 'admin'
    };
    
    console.log('New admin created successfully:', newAgent);
    res.status(201).json({ 
      message: 'New admin created',
      agent: newAgent
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Special route to create a specific admin account (TEMPORARY)
app.get('/api/create-specific-admin', async (req, res) => {
  try {
    const email = 'admin@creditplan.it';
    const password = '45640681';
    const firstName = 'Admin';
    const lastName = 'User';    
    console.log(`Creating specific admin account with email: ${email}`);
    
    // Check if user already exists
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('User already exists, updating role to admin');
    } catch (error) {
      // User doesn't exist, create new user
      console.log('User does not exist, creating new user');
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: `${firstName} ${lastName}`,
      });
    }
    
    // Check if agent exists in Firestore
    const agentsSnapshot = await db.collection('agents')
      .where('email', '==', email)
      .get();
    
    if (!agentsSnapshot.empty) {
      // Update existing agent to admin role
      console.log('Updating existing agent to admin role');
      const agentDoc = agentsSnapshot.docs[0];
      await agentDoc.ref.update({ role: 'admin' });
      
      return res.status(200).json({
        message: 'Admin account updated successfully',
        agent: {
          id: agentDoc.id,
          ...agentDoc.data(),
          role: 'admin'
        }
      });
    } else {
      // Create new agent with admin role
      console.log('Creating new agent with admin role');
      const newAgentRef = await db.collection('agents').add({
        uid: userRecord.uid,
        email,
        firstName,
        lastName,
        role: 'admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const newAgent = {
        id: newAgentRef.id,
        uid: userRecord.uid,
        email,
        firstName,
        lastName,
        role: 'admin'
      };
      
      return res.status(201).json({
        message: 'Admin account created successfully',
        agent: newAgent
      });
    }
  } catch (error) {
    console.error('Error creating admin account:', error);
    return res.status(500).json({
      message: 'Error creating admin account',
      error: error.message
    });
  }
});

// Special route to force fix admin role (TEMPORARY)
app.get('/api/force-fix-admin/:email', async (req, res) => {
  try {
    const email = req.params.email || 'admin@creditplan.it';
    console.log(`Attempting to force-fix admin role for email: ${email}`);
    
    // Find the user by email
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('Found user record:', userRecord.uid);
      
      // Set custom claims for admin role
      await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'admin' });
      console.log('Set admin claim in Firebase Auth');
      
      // Update or create Firestore agent document
      const agentsRef = db.collection('agents');
      const agentsSnapshot = await agentsRef.where('email', '==', email).get();
      
      if (!agentsSnapshot.empty) {
        // Update existing agent
        const agentDoc = agentsSnapshot.docs[0];
        console.log('Updating existing agent document:', agentDoc.id);
        await agentDoc.ref.update({ 
          role: 'admin',
          uid: userRecord.uid // Ensure UID is correctly set
        });
      } else {
        // Create new agent document
        console.log('Creating new agent document');
        await agentsRef.add({
          uid: userRecord.uid,
          email: userRecord.email,
          firstName: userRecord.displayName ? userRecord.displayName.split(' ')[0] : 'Admin',
          lastName: userRecord.displayName ? userRecord.displayName.split(' ').slice(1).join(' ') : 'User',
          role: 'admin',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      return res.status(200).json({
        message: 'Admin role fixed successfully',
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          role: 'admin'
        }
      });
    } catch (error) {
      console.error('Error fixing admin role:', error);
      return res.status(404).json({ message: 'User not found', error: error.message });
    }
  } catch (error) {
    console.error('Error in force-fix admin endpoint:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Utility function to verify and fix admin status for a user
async function verifyAndFixAdminStatus(email, uid) {
  console.log(`Verifying admin status for user: ${email} (${uid})`);
  
  // Check if the user exists in Firestore
  const agentsSnapshot = await db.collection('agents')
    .where('email', '==', email)
    .get();
  
  if (agentsSnapshot.empty) {
    console.log(`No agent record found for ${email}, creating one`);
    // Create a new agent record with admin role
    const userRecord = await admin.auth().getUser(uid);
    const displayName = userRecord.displayName || email.split('@')[0];
    const nameParts = displayName.split(' ');
    const firstName = nameParts[0] || 'Admin';
    const lastName = nameParts.slice(1).join(' ') || 'User';
    
    const newAgentRef = await db.collection('agents').add({
      uid: uid,
      email: email,
      firstName: firstName,
      lastName: lastName,
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Created new admin record: ${newAgentRef.id}`);
    return {
      fixed: true,
      action: 'created',
      id: newAgentRef.id
    };
  } else {
    // Update existing record if needed
    const agentDoc = agentsSnapshot.docs[0];
    const agentData = agentDoc.data();
    
    // Check if we need to update UID or role
    if (agentData.role !== 'admin' || agentData.uid !== uid) {
      console.log(`Updating agent record for ${email}: role=${agentData.role}, uid=${agentData.uid}`);
      
      await agentDoc.ref.update({
        role: 'admin',
        uid: uid  // Make sure UID is always correct
      });
      
      console.log(`Updated agent record to ensure admin status`);
      return {
        fixed: true,
        action: 'updated',
        id: agentDoc.id
      };
    }
    
    console.log(`Agent record is already correct for ${email}`);
    return {
      fixed: false,
      action: 'none',
      id: agentDoc.id
    };
  }
}

// Add this endpoint after the other API endpoints
// GET /api/verify-admin/:email - Verify and ensure admin privileges for a specific user
app.get('/api/verify-admin/:email', authenticate, async (req, res) => {
  try {
    const email = req.params.email;
    if (!email) {
      return res.status(400).json({ message: 'Email required' });
    }
    
    // Only admins can verify other users, but users can verify themselves
    const userIsAdmin = req.user.role === 'admin';
    const isCheckingSelf = req.user.email === email;
    
    if (!userIsAdmin && !isCheckingSelf) {
      return res.status(403).json({ 
        message: 'Unauthorized: Only admins can verify other users' 
      });
    }
    
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (error) {
      return res.status(404).json({ 
        message: 'User not found',
        error: error.message
      });
    }
    
    const result = await verifyAndFixAdminStatus(email, userRecord.uid);
    
    return res.status(200).json({
      message: result.fixed 
        ? `Admin status ${result.action} for ${email}` 
        : `Admin status already correct for ${email}`,
      user: {
        email: email,
        uid: userRecord.uid,
        role: 'admin',
        fixed: result.fixed,
        action: result.action
      }
    });
  } catch (error) {
    console.error('Error verifying admin status:', error);
    return res.status(500).json({ 
      message: 'Error verifying admin status',
      error: error.message
    });
  }
});

// Add memory monitoring and management
const monitorMemory = () => {
  const used = process.memoryUsage();
  const usage = {
    rss: `${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`,
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`,
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`,
    external: `${Math.round(used.external / 1024 / 1024 * 100) / 100} MB`,
  };
  
  console.log('Memory Usage:', usage);
  
  // If memory usage is too high, trigger garbage collection
  if (used.heapUsed > 500 * 1024 * 1024) { // 500MB threshold
    try {
      global.gc();
      console.log('Garbage collection triggered');
    } catch (e) {
      console.log('Garbage collection not available');
    }
  }
};

// Monitor memory every 5 minutes
setInterval(monitorMemory, 5 * 60 * 1000);

// Handle process signals
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM signal. Starting graceful shutdown...');
  try {
    // Close database connections
    await sequelize.close();
    console.log('Database connections closed.');
    
    // Cleanup Firebase Admin
    await admin.app().delete();
    console.log('Firebase Admin SDK cleaned up.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit immediately, give time for cleanup
  setTimeout(() => process.exit(1), 1000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// GET /api/check-user-role/:uid - Check a user's role
app.get('/api/check-user-role/:uid', authenticate, async (req, res) => {
  try {
    const uid = req.params.uid;
    console.log(`Checking role for UID: ${uid}`);
    
    // Get the user's email from the request
    const userEmail = req.user.email;
    console.log(`Checking role for email: ${userEmail}`);
    
    // Check for hardcoded admin emails first
    const adminEmails = ['it@creditplan.it', 'admin@creditplan.it'].map(email => email.toLowerCase());
    if (userEmail && adminEmails.includes(userEmail.toLowerCase())) {
      console.log(`${userEmail} is in admin list, returning admin role`);
      return res.json({ 
        role: 'admin',
        email: userEmail,
        message: 'Admin role assigned from hardcoded list'
      });
    }
    
    // Get the user from Firestore
    console.log(`Querying Firestore for user with UID: ${uid}`);
    const agentsSnapshot = await db.collection('agents')
      .where('uid', '==', uid)
      .limit(1)
      .get();
    
    if (agentsSnapshot.empty) {
      console.log(`No Firestore record found for UID: ${uid}`);
      // Try looking up by email
      if (userEmail) {
        const byEmailSnapshot = await db.collection('agents')
          .where('email', '==', userEmail)
          .limit(1)
          .get();
          
        if (!byEmailSnapshot.empty) {
          const agentData = byEmailSnapshot.docs[0].data();
          console.log(`Found agent by email: ${JSON.stringify(agentData)}`);
          return res.json({ 
            role: agentData.role || 'agent',
            email: agentData.email,
            id: byEmailSnapshot.docs[0].id
          });
        }
      }
      
      // If no record found, default to agent
      console.log(`No matching records found, defaulting to agent role`);
      return res.json({ 
        role: 'agent',
        email: userEmail,
        message: 'No admin record found'
      });
    }
    
    const agentData = agentsSnapshot.docs[0].data();
    console.log(`Found agent data: ${JSON.stringify(agentData)}`);
    
    return res.json({
      role: agentData.role || 'agent',
      email: agentData.email,
      id: agentsSnapshot.docs[0].id
    });
  } catch (err) {
    console.error('Error checking user role:', err);
    res.status(500).json({ 
      message: 'Server error when checking role',
      error: err.message,
      role: 'agent' // Default to agent on error
    });
  }
});

// GET /api/fix-specific-account?email=it@creditplan.it - Fix a specific account issue
app.get('/api/fix-specific-account', async (req, res) => {
  try {
    const email = req.query.email || 'it@creditplan.it';
    console.log(`Specifically fixing account for: ${email}`);
    
    // Find the user by email
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('Found Firebase user:', userRecord.uid);
    } catch (error) {
      console.error('Error finding user by email:', error);
      return res.status(404).json({ message: 'User not found', error: error.message });
    }
    
    // Check if the agent exists in Firestore
    const agentsSnapshot = await db.collection('agents')
      .where('email', '==', email)
      .get();
    
    // Create a transaction to ensure consistency
    await admin.firestore().runTransaction(async (transaction) => {
      if (agentsSnapshot.empty) {
        // Create new agent document
        console.log('No agent record found - creating new one with admin role');
        const newAgentRef = db.collection('agents').doc();
        
        transaction.set(newAgentRef, {
          uid: userRecord.uid,
          email: email,
          firstName: userRecord.displayName ? userRecord.displayName.split(' ')[0] : 'Admin',
          lastName: userRecord.displayName ? userRecord.displayName.split(' ').slice(1).join(' ') : 'User',
          role: 'admin',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Created new agent document with ID: ${newAgentRef.id}`);
      } else {
        // Update existing document
        const agentDoc = agentsSnapshot.docs[0];
        console.log(`Found existing agent document: ${agentDoc.id}`);
        
        transaction.update(agentDoc.ref, {
          uid: userRecord.uid,
          role: 'admin'
        });
        
        console.log(`Updated agent document with correct UID: ${userRecord.uid}`);
      }
    });
    
    // Set custom claims for extra measure
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'admin'
    });
    
    console.log(`Custom claims set for user: ${userRecord.uid}`);
    
    // Check the updated document
    const updatedSnapshot = await db.collection('agents')
      .where('email', '==', email)
      .get();
    
    if (!updatedSnapshot.empty) {
      const updatedDoc = updatedSnapshot.docs[0];
      const updatedData = updatedDoc.data();
      
      console.log(`Verification - Agent document ${updatedDoc.id}:`, updatedData);
      
      return res.status(200).json({
        message: 'Account successfully fixed',
        agent: {
          id: updatedDoc.id,
          ...updatedData
        }
      });
    } else {
      return res.status(500).json({
        message: 'Failed to verify account fix',
        error: 'Document not found after update'
      });
    }
  } catch (error) {
    console.error('Error fixing specific account:', error);
    return res.status(500).json({
      message: 'Error fixing account',
      error: error.message
    });
  }
});

// PUT /api/agents/:id/lead-sources - Update an agent's lead sources
app.put('/api/agents/:id/lead-sources', authenticate, requireAdmin, async (req, res) => {
  try {
    const agentId = req.params.id;
    const { leadSources } = req.body;
    
    if (!Array.isArray(leadSources)) {
      return res.status(400).json({ message: 'leadSources debe ser un array' });
    }
    
    // Get the agent document to find the Firebase UID
    const agentDoc = await db.collection('agents').doc(agentId).get();
    
    if (!agentDoc.exists) {
      return res.status(404).json({ message: 'Agente non trovato' });
    }
    
    // Update the agent's leadSources in Firestore
    await db.collection('agents').doc(agentId).update({
      leadSources: leadSources
    });
    
    // Sync with PostgreSQL (the listener will take care of this, but we can force it)
    const syncService = await import('./services/syncService.js');
    await syncService.syncAgentFromFirestore(agentId);
    
    res.json({ 
      message: 'Lead sources updated',
      agentId,
      leadSources
    });
  } catch (err) {
    console.error('Error updating lead sources:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/agents/:id/pages - Update an agent's pages (permissions)
app.put('/api/agents/:id/pages', authenticate, requireAdmin, async (req, res) => {
  try {
    const agentId = req.params.id;
    const { pages } = req.body;
    
    if (!Array.isArray(pages)) {
      return res.status(400).json({ message: 'pages debe ser un array' });
    }
    
    // Get the agent document
    const agentDoc = await db.collection('agents').doc(agentId).get();
    
    if (!agentDoc.exists) {
      return res.status(404).json({ message: 'Agente non trovato' });
    }
    
    // UPDATE: Update both pages and leadSources to ensure round-robin consistency
    await db.collection('agents').doc(agentId).update({
      pages: pages,
      leadSources: pages, // Sync leadSources with pages to fix round-robin assignment
      // For backwards compatibility
      page: pages[0] || "aiquinto"
    });
    
    console.log(`Updated agent ${agentId} with pages and leadSources:`, pages);
    
    // Sync with PostgreSQL
    const syncService = await import('./services/syncService.js');
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

// Iniciar sincronización de agentes entre Firestore y PostgreSQL
syncService.syncAllAgentsFromFirestore()
  .then(results => {
    console.log(`Sincronización inicial completada. ${results.length} agentes procesados.`);
    
    // Iniciar listener para cambios en Firestore
    const unsubscribe = syncService.startFirestoreAgentListener();
    
    // Registrar el unsubscribe para limpieza adecuada al cerrar
    process.on('SIGINT', () => {
      console.log('Deteniendo listener de Firestore...');
      unsubscribe();
      process.exit(0);
    });
  })
  .catch(error => {
    console.error('Error en sincronización inicial:', error);
  });

// Registrar las rutas de leads
app.use('/api/leads', leadRoutes);

// Register routes
app.use('/api/agents', agentRoutes);
app.use('/api', authRoutes);

// Modify server startup
const PORT = process.env.PORT || 4000;

// Configure Sequelize connection pool
sequelize.options.pool = {
  max: 5,
  min: 0,
  acquire: 30000,
  idle: 10000
};

// Sync database models before starting the server
sequelize.sync({ alter: true })
  .then(() => {
    console.log('Database synchronized');
    const server = app.listen(PORT, () => {
      console.log(`Backend running on https://accelera-crm-production.up.railway.app`);
      monitorMemory(); // Initial memory check
    });
    
    // Add server error handling
    server.on('error', (error) => {
      console.error('Server error:', error);
    });

    // Add keep-alive configuration
    server.keepAliveTimeout = 65000; // Slightly higher than 60 seconds
    server.headersTimeout = 66000; // Slightly higher than keepAliveTimeout
  })
  .catch(err => {
    console.error('Error syncing database:', err);
  });
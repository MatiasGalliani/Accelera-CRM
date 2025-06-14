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
import formRoutes from './routes/formRoutes.js';
import cors from 'cors';
import { canRunMaintenance, safeDbOperation } from './config/database-safety.js';

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

// Define allowed origins
const allowedOrigins = [
  'https://accelera.creditplan.it',
  'http://localhost:5173',
  'http://localhost:3000'
];

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log('Blocked by CORS:', origin);
      return callback(new Error('Not allowed by CORS'), false);
    }
    
    console.log('Allowed by CORS:', origin);
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'Accept',
    'Origin',
    'X-Requested-With',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'Authorization',
    'X-API-Key'
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Add API key verification middleware
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.WEBHOOK_API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
};

// Remove the development fallback
if (!process.env.WEBHOOK_API_KEY) {
  console.error('WEBHOOK_API_KEY not set in environment variables.');
  process.exit(1);
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
          
          // Prepare case data
          const caseData = {
            caseNumber,
            title: product.title,
            description: `${product.title} - ${product.description}`,
            status: 'new',
            priority: 'medium',
            clientId: client.id,
            assignedAgentId: req.user.agentId // Always set the agent ID from the authenticated user
          };
          
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

// Wrap all maintenance functions
async function verifyAndFixAdminStatus(email, uid) {
  if (!canRunMaintenance()) return;
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

function monitorMemory() {
  if (!canRunMaintenance()) return;
  const used = process.memoryUsage();
  console.log('Memory usage:');
  for (let key in used) {
    console.log(`${key}: ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
  }
}

// Modify server startup
const PORT = process.env.PORT || 4000;

// Configure Sequelize connection pool
sequelize.options.pool = {
  max: 2,
  min: 0,
  acquire: 60000,
  idle: 10000
};

// Sync database models before starting the server
sequelize.sync({ alter: true })
  .then(() => {
    console.log('Database synchronized');
    const server = app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
      monitorMemory(); // Initial memory check
    });
    
    // Add server error handling
    server.on('error', (error) => {
      console.error('Server error:', error);
    });

    // Add keep-alive configuration
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;

    // Monitor memory usage periodically
    setInterval(monitorMemory, 300000); // Every 5 minutes

    // Add graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM signal. Starting graceful shutdown...');
      server.close(async () => {
        try {
          await sequelize.close();
          console.log('Database connections closed.');
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    });
  })
  .catch(err => {
    console.error('Error syncing database:', err);
    process.exit(1);
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
app.put('/api/agents/:id/pages', authenticate, async (req, res) => {
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

    // Check if user is admin or if they're accessing their own pages
    const isAdmin = await checkIsAdmin(req.user.uid);
    const isOwnPages = agentDoc.data().uid === req.user.uid;
    
    if (!isAdmin && !isOwnPages) {
      return res.status(403).json({ message: 'Non hai i permessi per modificare le pagine di questo agente' });
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

// Helper function to check if a user is admin
async function checkIsAdmin(uid) {
  if (!canRunMaintenance()) return;
  // First check in Firestore
  const agentsSnapshot = await db.collection('agents')
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
  const { Agent } = await import('./models/leads-index.js');
  const pgAgent = await Agent.findOne({ where: { firebaseUid: uid } });
  return pgAgent?.role === 'admin';
}

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

// Register routes
app.use('/api/leads', leadRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api', authRoutes);
app.use('/api/forms', formRoutes);

// Add health check endpoint
app.get('/health', (req, res) => {
  const status = {
    server: 'up',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: sequelize.authenticate()
      .then(() => 'connected')
      .catch(() => 'disconnected'),
    environment: process.env.NODE_ENV || 'development'
  };
  
  Promise.resolve(status.database)
    .then(dbStatus => {
      status.database = dbStatus;
      res.json(status);
    })
    .catch(err => {
      status.database = 'error';
      res.status(500).json(status);
    });
});

// Add status monitoring middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Additional Utility Functions for Database Maintenance and Fixes
async function fixAgenteDos() {
  if (!canRunMaintenance()) return;
  try {
    const agents = await Agent.findAll({
      where: { email: 'agente2@creditplan.it' }
    });
    
    for (const agent of agents) {
      await agent.update({ role: 'agent' });
      console.log(`✅ Fixed agent role for ${agent.email}`);
    }
    console.log('✅ All agente2 fixes completed');
  } catch (error) {
    console.error('Error fixing agente2:', error);
  }
}

async function fixSequelizeMapping() {
  if (!canRunMaintenance()) return;
  try {
    const agents = await Agent.findAll();
    for (const agent of agents) {
      if (!agent.firebaseUid && agent.uid) {
        await agent.update({ firebaseUid: agent.uid });
        console.log(`✅ Fixed mapping for agent ${agent.email}`);
      }
    }
    console.log('✅ All Sequelize mappings fixed');
  } catch (error) {
    console.error('Error fixing Sequelize mappings:', error);
  }
}

async function ensureAgentSources() {
  if (!canRunMaintenance()) return;
  try {
    const agents = await Agent.findAll({ where: { isActive: true } });
    for (const agent of agents) {
      const sources = await AgentLeadSource.findAll({ where: { agentId: agent.id } });
      if (sources.length === 0) {
        await AgentLeadSource.create({
          agentId: agent.id,
          sourceName: 'default',
          isActive: true
        });
        console.log(`✅ Added default source for agent ${agent.email}`);
      }
    }
    console.log('✅ All agent sources ensured');
  } catch (error) {
    console.error('Error ensuring agent sources:', error);
  }
}

async function fixAdminSources() {
  if (!canRunMaintenance()) return;
  try {
    const adminAgents = await Agent.findAll({ where: { role: 'admin' } });
    for (const admin of adminAgents) {
      const sources = await AgentLeadSource.findAll({ where: { agentId: admin.id } });
      if (sources.length === 0) {
        await AgentLeadSource.create({
          agentId: admin.id,
          sourceName: 'admin',
          isActive: true
        });
        console.log(`✅ Added admin source for ${admin.email}`);
      }
    }
    console.log('✅ All admin sources fixed');
  } catch (error) {
    console.error('Error fixing admin sources:', error);
  }
}

async function debugSyncIssue() {
  if (!canRunMaintenance()) return;
  try {
    const leads = await Lead.findAll({
      where: {
        syncStatus: 'error'
      }
    });
    
    for (const lead of leads) {
      console.log(`Lead ${lead.id} sync error:`, lead.syncError);
      await lead.update({ 
        syncStatus: 'pending',
        syncError: null
      });
      console.log(`✅ Reset sync status for lead ${lead.id}`);
    }
    console.log('✅ All sync issues debugged');
  } catch (error) {
    console.error('Error debugging sync issues:', error);
  }
}

async function enhanceSyncSystem() {
  if (!canRunMaintenance()) return;
  try {
    const leads = await Lead.findAll();
    for (const lead of leads) {
      if (!lead.syncStatus) {
        await lead.update({ syncStatus: 'pending' });
        console.log(`✅ Added sync status for lead ${lead.id}`);
      }
    }
    console.log('✅ Sync system enhanced');
  } catch (error) {
    console.error('Error enhancing sync system:', error);
  }
}

async function directCountSources() {
  if (!canRunMaintenance()) return;
  try {
    const sources = await AgentLeadSource.findAll({
      attributes: ['sourceName', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['sourceName']
    });
    console.log('Source counts:', sources);
    return sources;
  } catch (error) {
    console.error('Error counting sources:', error);
  }
}

async function finalFixLeads() {
  if (!canRunMaintenance()) return;
  try {
    const leads = await Lead.findAll({
      where: {
        status: null
      }
    });
    
    for (const lead of leads) {
      await lead.update({ status: 'new' });
      console.log(`✅ Fixed status for lead ${lead.id}`);
    }
    console.log('✅ All leads fixed');
  } catch (error) {
    console.error('Error fixing leads:', error);
  }
}

async function countActualAgents() {
  if (!canRunMaintenance()) return;
  try {
    const count = await Agent.count({
      where: { isActive: true }
    });
    console.log(`Total active agents: ${count}`);
    return count;
  } catch (error) {
    console.error('Error counting agents:', error);
  }
}

async function countBySource() {
  if (!canRunMaintenance()) return;
  try {
    const sources = await AgentLeadSource.findAll({
      attributes: ['sourceName', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['sourceName']
    });
    console.log('Source distribution:', sources);
    return sources;
  } catch (error) {
    console.error('Error counting by source:', error);
  }
}

async function directAddAimedici() {
  if (!canRunMaintenance()) return;
  try {
    const agents = await Agent.findAll({ where: { isActive: true } });
    for (const agent of agents) {
      await AgentLeadSource.create({
        agentId: agent.id,
        sourceName: 'aimedici',
        isActive: true
      });
      console.log(`✅ Added aimedici source for agent ${agent.email}`);
    }
    console.log('✅ All aimedici sources added');
  } catch (error) {
    console.error('Error adding aimedici sources:', error);
  }
}

async function directCheckRobin() {
  if (!canRunMaintenance()) return;
  try {
    const agents = await Agent.findAll({ where: { isActive: true } });
    for (const agent of agents) {
      const sources = await AgentLeadSource.findAll({ where: { agentId: agent.id } });
      if (sources.length === 0) {
        await AgentLeadSource.create({
          agentId: agent.id,
          sourceName: 'round-robin',
          isActive: true
        });
        console.log(`✅ Added round-robin source for agent ${agent.email}`);
      }
    }
    console.log('✅ All round-robin sources checked');
  } catch (error) {
    console.error('Error checking round-robin:', error);
  }
}

async function cleanDeletedAgents() {
  if (!canRunMaintenance()) return;
  try {
    const agents = await Agent.findAll({ where: { isActive: false } });
    for (const agent of agents) {
      await agent.destroy();
      console.log(`✅ Cleaned deleted agent ${agent.email}`);
    }
    console.log('✅ All deleted agents cleaned');
  } catch (error) {
    console.error('Error cleaning deleted agents:', error);
  }
}

// Admin routes for running additional fixes
app.post('/api/admin/fix/agentedos', authenticate, requireAdmin, async (req, res) => {
  try {
    await fixAgenteDos();
    res.json({ message: 'Agente2 fixes completed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/fix/sequelize-mapping', authenticate, requireAdmin, async (req, res) => {
  try {
    await fixSequelizeMapping();
    res.json({ message: 'Sequelize mappings fixed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/fix/ensure-sources', authenticate, requireAdmin, async (req, res) => {
  try {
    await ensureAgentSources();
    res.json({ message: 'Agent sources ensured successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/fix/admin-sources', authenticate, requireAdmin, async (req, res) => {
  try {
    await fixAdminSources();
    res.json({ message: 'Admin sources fixed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/fix/debug-sync', authenticate, requireAdmin, async (req, res) => {
  try {
    await debugSyncIssue();
    res.json({ message: 'Sync issues debugged successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/fix/enhance-sync', authenticate, requireAdmin, async (req, res) => {
  try {
    await enhanceSyncSystem();
    res.json({ message: 'Sync system enhanced successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/fix/final-leads', authenticate, requireAdmin, async (req, res) => {
  try {
    await finalFixLeads();
    res.json({ message: 'Leads fixed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/fix/clean-agents', authenticate, requireAdmin, async (req, res) => {
  try {
    await cleanDeletedAgents();
    res.json({ message: 'Deleted agents cleaned successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/stats/sources', authenticate, requireAdmin, async (req, res) => {
  try {
    const sources = await directCountSources();
    res.json({ sources });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/stats/agents', authenticate, requireAdmin, async (req, res) => {
  try {
    const count = await countActualAgents();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/stats/source-distribution', authenticate, requireAdmin, async (req, res) => {
  try {
    const sources = await countBySource();
    res.json({ sources });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Additional Utility Functions for Database Maintenance and Fixes
async function countAimediciAgents() {
  if (!canRunMaintenance()) return;
  try {
    const count = await Agent.count({
      where: {
        isActive: true,
        '$leadSources.sourceName$': 'aimedici'
      },
      include: [{
        model: AgentLeadSource,
        as: 'leadSources'
      }]
    });
    console.log(`Total agents with aimedici source: ${count}`);
    return count;
  } catch (error) {
    console.error('Error counting aimedici agents:', error);
  }
}

async function addAimediciSource() {
  if (!canRunMaintenance()) return;
  try {
    const agents = await Agent.findAll({ where: { isActive: true } });
    for (const agent of agents) {
      const hasAimedici = await AgentLeadSource.findOne({
        where: {
          agentId: agent.id,
          sourceName: 'aimedici'
        }
      });
      
      if (!hasAimedici) {
        await AgentLeadSource.create({
          agentId: agent.id,
          sourceName: 'aimedici',
          isActive: true
        });
        console.log(`✅ Added aimedici source for agent ${agent.email}`);
      }
    }
    console.log('✅ All aimedici sources added');
  } catch (error) {
    console.error('Error adding aimedici sources:', error);
  }
}

async function checkAdminSources() {
  if (!canRunMaintenance()) return;
  try {
    const adminAgents = await Agent.findAll({ where: { role: 'admin' } });
    for (const admin of adminAgents) {
      const sources = await AgentLeadSource.findAll({ where: { agentId: admin.id } });
      console.log(`Admin ${admin.email} has ${sources.length} sources:`, sources.map(s => s.sourceName));
    }
    console.log('✅ Admin sources checked');
  } catch (error) {
    console.error('Error checking admin sources:', error);
  }
}

async function checkAgent() {
  if (!canRunMaintenance()) return;
  try {
    const agents = await Agent.findAll({ where: { isActive: true } });
    for (const agent of agents) {
      console.log(`Agent ${agent.email}:`);
      console.log(`- Role: ${agent.role}`);
      console.log(`- Active: ${agent.isActive}`);
      console.log(`- Firebase UID: ${agent.firebaseUid || agent.uid}`);
    }
    console.log('✅ All agents checked');
  } catch (error) {
    console.error('Error checking agents:', error);
  }
}

async function checkLeads() {
  if (!canRunMaintenance()) return;
  try {
    const leads = await Lead.findAll();
    console.log(`Total leads: ${leads.length}`);
    const statusCounts = {};
    leads.forEach(lead => {
      statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
    });
    console.log('Lead status distribution:', statusCounts);
    console.log('✅ All leads checked');
  } catch (error) {
    console.error('Error checking leads:', error);
  }
}

async function checkRoundRobin() {
  if (!canRunMaintenance()) return;
  try {
    const agents = await Agent.findAll({ where: { isActive: true } });
    for (const agent of agents) {
      const hasRobin = await AgentLeadSource.findOne({
        where: {
          agentId: agent.id,
          sourceName: 'round-robin'
        }
      });
      console.log(`Agent ${agent.email} has round-robin: ${!!hasRobin}`);
    }
    console.log('✅ Round-robin distribution checked');
  } catch (error) {
    console.error('Error checking round-robin:', error);
  }
}

async function checkAgentSources() {
  if (!canRunMaintenance()) return;
  try {
    const agents = await Agent.findAll({ where: { isActive: true } });
    for (const agent of agents) {
      const sources = await AgentLeadSource.findAll({ where: { agentId: agent.id } });
      console.log(`Agent ${agent.email} sources:`, sources.map(s => s.sourceName));
    }
    console.log('✅ All agent sources checked');
  } catch (error) {
    console.error('Error checking agent sources:', error);
  }
}

async function forceAddSource() {
  if (!canRunMaintenance()) return;
  try {
    const { agentId, sourceName } = req.body;
    if (!agentId || !sourceName) {
      throw new Error('Agent ID and source name are required');
    }
    
    const agent = await Agent.findByPk(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }
    
    await AgentLeadSource.create({
      agentId: agent.id,
      sourceName: sourceName,
      isActive: true
    });
    
    console.log(`✅ Added source ${sourceName} for agent ${agent.email}`);
    return true;
  } catch (error) {
    console.error('Error forcing source addition:', error);
    throw error;
  }
}

async function runMigration() {
  if (!canRunMaintenance()) return;
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Database migration completed');
  } catch (error) {
    console.error('Error running migration:', error);
    throw error;
  }
}

// Admin routes for running additional fixes
app.post('/api/admin/fix/count-aimedici', authenticate, requireAdmin, async (req, res) => {
  try {
    const count = await countAimediciAgents();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/fix/add-aimedici', authenticate, requireAdmin, async (req, res) => {
  try {
    await addAimediciSource();
    res.json({ message: 'Aimedici sources added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/check/admin-sources', authenticate, requireAdmin, async (req, res) => {
  try {
    await checkAdminSources();
    res.json({ message: 'Admin sources checked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/check/agents', authenticate, requireAdmin, async (req, res) => {
  try {
    await checkAgent();
    res.json({ message: 'Agents checked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/check/leads', authenticate, requireAdmin, async (req, res) => {
  try {
    await checkLeads();
    res.json({ message: 'Leads checked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/check/round-robin', authenticate, requireAdmin, async (req, res) => {
  try {
    await checkRoundRobin();
    res.json({ message: 'Round-robin distribution checked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/check/agent-sources', authenticate, requireAdmin, async (req, res) => {
  try {
    await checkAgentSources();
    res.json({ message: 'Agent sources checked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/fix/force-source', authenticate, requireAdmin, async (req, res) => {
  try {
    await forceAddSource();
    res.json({ message: 'Source added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/run-migration', authenticate, requireAdmin, async (req, res) => {
  try {
    await runMigration();
    res.json({ message: 'Migration completed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/cases/my-cases - List cases for the current agent
app.get('/api/cases/my-cases', authenticate, async (req, res) => {
  try {
    // First, get the agent's ID from the database using their Firebase UID
    const { Agent } = await import('./models/leads-index.js');
    const agent = await Agent.findOne({
      where: { firebaseUid: req.user.uid }
    });

    if (!agent) {
      console.error('Agent not found for Firebase UID:', req.user.uid);
      return res.status(404).json({ 
        message: 'Agente non trovato',
        error: 'Agent record not found in database'
      });
    }

    // Get cases for the current agent using their database ID
    const cases = await Case.findAll({
      where: {
        assignedAgentId: agent.id
      },
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
          type: 'privato',
          agent: req.user.name || req.user.email || req.user.uid || 'Agente',
          status: caseData.status || 'pending'
        };
      }
      
      // Extract the product description correctly
      let productTitle = caseData.title;
      let productDescription = '';
      
      if (caseData.description && caseData.description.includes(' - ')) {
        productDescription = caseData.description.split(' - ')[1];
      } else {
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
    console.error('Error fetching agent cases:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message  // Include error message for debugging
    });
  }
});
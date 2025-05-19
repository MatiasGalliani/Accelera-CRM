import express from 'express';
import admin from 'firebase-admin';
import { authenticate } from '../middleware/auth.js';
import { Agent } from '../models/leads-index.js';

const router = express.Router();

// GET /api/check-user-role/:uid - Check a user's role
router.get('/check-user-role/:uid', authenticate, async (req, res) => {
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
    
    // Get the user from database
    const agent = await Agent.findOne({
      where: { firebaseUid: uid }
    });
    
    if (!agent) {
      console.log(`No agent record found for UID: ${uid}`);
      return res.json({ 
        role: 'agent',
        email: userEmail,
        message: 'No admin record found'
      });
    }
    
    console.log(`Found agent data:`, agent.toJSON());
    
    return res.json({
      role: agent.role || 'agent',
      email: agent.email,
      id: agent.id
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

// GET /api/create-admin/:email - Create or ensure admin status for a user
router.get('/create-admin/:email', authenticate, async (req, res) => {
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
    const agent = await Agent.findOne({
      where: { email: email }
    });
    
    if (agent) {
      // Update the role to admin in the existing document
      console.log('Agent document exists, updating to admin role');
      await agent.update({ 
        role: 'admin',
        firebaseUid: userRecord.uid // Ensure UID is correct
      });
      
      console.log('Agent updated successfully to admin with UID:', userRecord.uid);
      return res.status(200).json({ 
        message: 'User updated to admin',
        agent: agent.toJSON()
      });
    }
    
    // If user doesn't exist in agents table, create a new record
    console.log('Creating new agent document with admin role');
    const newAgent = await Agent.create({
      firebaseUid: userRecord.uid,
      email: userRecord.email,
      firstName: userRecord.displayName ? userRecord.displayName.split(' ')[0] : 'Admin',
      lastName: userRecord.displayName ? userRecord.displayName.split(' ').slice(1).join(' ') : 'User',
      role: 'admin'
    });
    
    console.log('New admin document created:', newAgent.toJSON());
    
    res.status(201).json({ 
      message: 'New admin created',
      agent: newAgent.toJSON()
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/firebase-users - Get all Firebase users (admin only)
router.get('/firebase-users', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    const agent = await Agent.findOne({
      where: { firebaseUid: req.user.uid }
    });
    
    if (!agent || agent.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }
    
    // List all users from Firebase Auth
    const listUsersResult = await admin.auth().listUsers();
    const users = listUsersResult.users.map(user => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      disabled: user.disabled,
      emailVerified: user.emailVerified,
      metadata: user.metadata
    }));
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching Firebase users:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

export default router; 
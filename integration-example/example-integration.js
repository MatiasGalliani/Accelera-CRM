/**
 * Example of external form system integration with CRM
 * 
 * This file demonstrates how to:
 * 1. Authenticate with Firebase
 * 2. Get allowed agents for a source from the CRM
 * 3. Select an agent using round-robin
 * 4. Send lead data to the CRM webhook
 */

const axios = require('axios');
require('dotenv').config();

// CRM API configuration
const CRM_WEBHOOK_URL = process.env.CRM_WEBHOOK_URL || '/api/leads/webhook';
const CRM_API_KEY = process.env.WEBHOOK_API_KEY;
const CRM_BASE_URL = process.env.CRM_BASE_URL || 'https://your-crm-url.com';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const FIREBASE_AUTH_EMAIL = process.env.FIREBASE_AUTH_EMAIL;
const FIREBASE_AUTH_PASSWORD = process.env.FIREBASE_AUTH_PASSWORD;

// Cache token to avoid multiple authentications
let firebaseToken = null;
let tokenExpiry = null;

// Source-specific round robin indexes
const roundRobinIndexes = {
  'aiquinto': 0,
  'aimedici': 0,
  'aifidi': 0
};

// Cache for agents by source (to avoid excessive API calls)
const agentCache = {
  // 'source': { agents: [], timestamp: Date.now() }
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Authenticate with Firebase and get a token
 */
async function getFirebaseToken() {
  try {
    // If we have a valid token, return it
    if (firebaseToken && tokenExpiry && new Date() < tokenExpiry) {
      return firebaseToken;
    }

    // Otherwise, get a new token
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        email: FIREBASE_AUTH_EMAIL,
        password: FIREBASE_AUTH_PASSWORD,
        returnSecureToken: true
      }
    );

    firebaseToken = response.data.idToken;
    // Set token expiry (tokens typically last 1 hour)
    const expiresIn = parseInt(response.data.expiresIn);
    tokenExpiry = new Date(new Date().getTime() + expiresIn * 1000);
    
    return firebaseToken;
  } catch (error) {
    console.error('Error authenticating with Firebase:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get agents from CRM that are allowed for a specific source
 */
async function getAgentsFromCRM(source) {
  try {
    // Check cache first
    if (agentCache[source] && 
        agentCache[source].timestamp > Date.now() - CACHE_TTL && 
        agentCache[source].agents.length > 0) {
      console.log(`Using cached agents for source: ${source}`);
      return agentCache[source].agents;
    }
    
    // Get Firebase token for authentication
    const token = await getFirebaseToken();
    
    // Make request to the CRM API
    const response = await axios.get(`${CRM_BASE_URL}/api/leads/allowed-sources?source=${source}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Update cache
    agentCache[source] = {
      agents: response.data,
      timestamp: Date.now()
    };
    
    console.log(`Retrieved ${response.data.length} agents for source: ${source}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching agents from CRM for source ${source}:`, error.response?.data || error.message);
    return [];
  }
}

/**
 * Select an agent using round-robin for a specific source
 */
async function getAgentByRoundRobin(source) {
  // Get agents for this specific source
  const agents = await getAgentsFromCRM(source);
  
  if (!agents || agents.length === 0) {
    throw new Error(`No agents available from CRM for source: ${source}`);
  }
  
  // Get the current index for this source
  const currentIndex = roundRobinIndexes[source] || 0;
  
  // Get the agent at the current index
  const agent = agents[currentIndex];
  
  // Update index for next request
  roundRobinIndexes[source] = (currentIndex + 1) % agents.length;
  console.log(`Agent selected for ${source}:`, agent.email);
  console.log(`New round-robin index for ${source}:`, roundRobinIndexes[source]);
  
  return agent;
}

/**
 * Send lead data to CRM webhook
 */
async function sendToCRM(data) {
  try {
    // Get Firebase token for authentication
    const token = await getFirebaseToken();
    
    const response = await axios.post(`${CRM_BASE_URL}${CRM_WEBHOOK_URL}`, data, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Data sent to CRM successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending data to CRM:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Process a form submission
 */
async function processFormSubmission(formData, source) {
  try {
    // Get agent using round robin from CRM
    const agent = await getAgentByRoundRobin(source);
    
    // Format data for CRM webhook
    const crmData = {
      source: source,
      firstName: formData.firstName || formData.nome,
      lastName: formData.lastName || formData.cognome,
      email: formData.email || formData.mail,
      phone: formData.phone || formData.telefono,
      agentId: agent.id,
      // Add any additional fields specific to the lead source
      ...formData.additionalFields
    };

    // Send data to CRM webhook
    const result = await sendToCRM(crmData);
    
    return {
      success: true,
      agentId: agent.id,
      agentEmail: agent.email,
      agentName: agent.name,
      leadId: result.leadId
    };
  } catch (error) {
    console.error('Error processing form submission:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Example usage
async function main() {
  try {
    const result = await processFormSubmission({
      nome: 'John',
      cognome: 'Doe',
      mail: 'john.doe@example.com',
      telefono: '1234567890',
      additionalFields: {
        requestedAmount: '10000',
        pensionAmount: '2500'
      }
    }, 'aiquinto');
    
    console.log('Form processed:', result);
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  getAgentByRoundRobin,
  sendToCRM,
  processFormSubmission
}; 
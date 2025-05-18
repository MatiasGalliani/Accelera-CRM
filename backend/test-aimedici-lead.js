// Node.js script to submit a test lead to the API for AImedici
// This simulates a form submission from AImedici.it
// Run with: node test-aimedici-lead.js

import fetch from 'node-fetch';

async function testSubmitMediciLead() {
  console.log('Submitting test lead to API for AImedici source...');

  // Generate unique timestamp for email
  const timestamp = Date.now();

  // Lead data exactly as it would be sent from the AImedici form
  const leadData = {
    source: 'aimedici',
    firstName: 'Lucia',
    lastName: 'Verdi',
    email: `test-aimedici-${timestamp}@example.com`,
    phone: '3351234567',
    message: 'Ho bisogno di una visita specialistica per problemi di gastroenterologia.',
    scopoRichiesta: 'Visita gastroenterologica',
    importoRichiesto: '190',
    cittaResidenza: 'Milano',
    provinciaResidenza: 'MI',
    privacyAccettata: true
  };

  try {
    // Make the API request
    const response = await fetch('http://localhost:3000/api/leads/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'dev-api-key-123'
      },
      body: JSON.stringify(leadData)
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ AImedici lead submitted successfully!');
      console.log('Response from server:', data);
      console.log(`\nLead ID: ${data.leadId}`);
      console.log(`Source: ${data.source}`);
      console.log(`Assigned to agent ID: ${data.assignedAgentId}`);
    } else {
      console.error('❌ Error submitting AImedici lead');
      console.error('Server response:', data);
    }
  } catch (error) {
    console.error('❌ Exception occurred:', error);
  }
}

// Run the test function
testSubmitMediciLead(); 
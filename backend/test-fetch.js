// This is a simple JavaScript file that uses fetch to submit a lead to the API
// Run this with: node test-fetch.js

import fetch from 'node-fetch';

async function testSubmitLead() {
  console.log('Submitting test lead to API...');

  // Lead data exactly as it would be sent from a form
  const leadData = {
    firstName: 'Carlo',
    lastName: 'Rossi',
    email: `test-${Date.now()}@example.com`,
    phone: '3489832145',
    message: 'Voglio comprare una casa nuova',
    source: 'aiquinto',
    importoRichiesto: '180000',
    stipendioNetto: '2900',
    tipologiaDipendente: 'Pubblico',
    sottotipo: 'Statale',
    tipoContratto: 'Tempo Indeterminato',
    provinciaResidenza: 'Firenze',
    privacyAccettata: true
  };

  try {
    // Exactly the same request a real website would make
    const response = await fetch('https://accelera-crm-production.up.railway.app/api/leads/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'dev-api-key-123'
      },
      body: JSON.stringify(leadData)
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Lead submitted successfully!');
      console.log('Response from server:', data);
      console.log(`\nLead ID: ${data.leadId}`);
      console.log(`Source: ${data.source}`);
      console.log(`Assigned to agent ID: ${data.assignedAgentId}`);
    } else {
      console.error('❌ Error submitting lead');
      console.error('Server response:', data);
    }
  } catch (error) {
    console.error('❌ Exception occurred:', error);
  }
}

// Run the test
testSubmitLead(); 
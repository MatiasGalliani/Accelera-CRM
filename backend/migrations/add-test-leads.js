import { Lead } from '../models/leads-index.js';
import sequelize from '../config/database.js';

async function addTestLeads() {
  try {
    console.log('Adding test leads...');

    // Test leads for AIMedici
    await Lead.bulkCreate([
      {
        source: 'aimedici',
        firstName: 'Test',
        lastName: 'Medico1',
        email: 'test.medico1@example.com',
        phone: '1234567890',
        status: 'new'
      },
      {
        source: 'aimedici',
        firstName: 'Test',
        lastName: 'Medico2',
        email: 'test.medico2@example.com',
        phone: '1234567891',
        status: 'new'
      }
    ]);

    // Test leads for AIQuinto
    await Lead.bulkCreate([
      {
        source: 'aiquinto',
        firstName: 'Test',
        lastName: 'Quinto1',
        email: 'test.quinto1@example.com',
        phone: '1234567892',
        status: 'new'
      },
      {
        source: 'aiquinto',
        firstName: 'Test',
        lastName: 'Quinto2',
        email: 'test.quinto2@example.com',
        phone: '1234567893',
        status: 'new'
      }
    ]);

    // Test leads for AIFidi
    await Lead.bulkCreate([
      {
        source: 'aifidi',
        firstName: 'Test',
        lastName: 'Fidi1',
        email: 'test.fidi1@example.com',
        phone: '1234567894',
        status: 'new'
      },
      {
        source: 'aifidi',
        firstName: 'Test',
        lastName: 'Fidi2',
        email: 'test.fidi2@example.com',
        phone: '1234567895',
        status: 'new'
      }
    ]);

    console.log('Test leads added successfully');
  } catch (error) {
    console.error('Error adding test leads:', error);
    throw error;
  }
}

// Run if this file is called directly
if (process.argv[1] === import.meta.url) {
  addTestLeads()
    .then(() => {
      console.log('Test leads migration completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error in test leads migration:', error);
      process.exit(1);
    });
}

export default addTestLeads; 
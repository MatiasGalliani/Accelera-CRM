import { Lead } from '../models/leads-index.js';
import sequelize from '../config/database.js';

async function checkLeads() {
  try {
    console.log('Checking leads in database...');
    
    const leads = await Lead.findAll();
    console.log(`Found ${leads.length} leads in the database`);
    
    // Group leads by source
    const leadsBySource = leads.reduce((acc, lead) => {
      acc[lead.source] = (acc[lead.source] || 0) + 1;
      return acc;
    }, {});
    
    console.log('Leads by source:', leadsBySource);
    
    // If no leads found, suggest running the initialization
    if (leads.length === 0) {
      console.log('\nNo leads found in the database. Please run:');
      console.log('node backend/init-db.js');
    }
  } catch (error) {
    console.error('Error checking leads:', error);
  } finally {
    await sequelize.close();
  }
}

// Run if this file is called directly
if (process.argv[1] === import.meta.url) {
  checkLeads()
    .then(() => {
      console.log('Check completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export default checkLeads; 
import { Lead } from '../models/leads-index.js';

async function deleteLead326() {
  try {
    const lead = await Lead.findByPk(326);
    if (!lead) {
      console.log('Lead ID 326 not found.');
      return;
    }
    await lead.destroy();
    console.log('Lead ID 326 deleted successfully.');
  } catch (error) {
    console.error('Error deleting lead:', error);
  }
}

deleteLead326(); 
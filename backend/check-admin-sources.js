import { Agent, AgentLeadSource } from './models/leads-index.js';
import sequelize from './config/database.js';

async function checkAdminSources() {
  try {
    console.log('Checking admin users with lead sources...');
    
    const adminAgents = await Agent.findAll({
      where: { role: 'admin' },
      include: [{ model: AgentLeadSource }]
    });
    
    console.log(`Found ${adminAgents.length} admin users`);
    
    for (const admin of adminAgents) {
      console.log(`\nAdmin: ${admin.email} (ID: ${admin.id})`);
      console.log(`Lead Sources (${admin.AgentLeadSources.length}):`, 
        admin.AgentLeadSources.map(s => s.source));
      
      if (admin.AgentLeadSources.length > 0) {
        console.log('WARNING: This admin has lead sources and might be included in round-robin!');
        
        // Optional: Remove lead sources from admin
        console.log('Removing lead sources from admin user...');
        await AgentLeadSource.destroy({
          where: { agentId: admin.id }
        });
        console.log('Lead sources removed.');
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

// Run the function
checkAdminSources(); 
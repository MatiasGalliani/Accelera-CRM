import { Agent, AgentLeadSource } from './models/leads-index.js';
import sequelize from './config/database.js';

/**
 * Count non-admin agents with access to aimedici lead source
 */
async function countActualAgents() {
  try {
    console.log('Counting non-admin agents with access to aimedici source...');
    
    // Find all agent lead sources for aimedici with non-admin agents
    const aimediciAgentSources = await AgentLeadSource.findAll({
      where: { source: 'aimedici' },
      include: [{ 
        model: Agent, 
        attributes: ['id', 'firstName', 'lastName', 'email', 'isActive', 'role'],
        where: { 
          isActive: true,
          role: 'agent' // Only regular agents, not admins
        }
      }]
    });
    
    console.log(`\n✅ Found ${aimediciAgentSources.length} active regular agents with access to aimedici source:`);
    
    // Display the list of agents
    aimediciAgentSources.forEach((agentSource, index) => {
      console.log(`${index + 1}. ${agentSource.Agent.firstName} ${agentSource.Agent.lastName} (${agentSource.Agent.email})`);
    });

    // Show all active regular agents
    console.log('\nListing all active regular agents in the system:');
    const allAgents = await Agent.findAll({
      where: { 
        isActive: true,
        role: 'agent'
      },
      attributes: ['id', 'firstName', 'lastName', 'email']
    });

    allAgents.forEach((agent, index) => {
      console.log(`${index + 1}. ${agent.firstName} ${agent.lastName} (${agent.email})`);
    });
    
    // Show all admins separately
    console.log('\nListing all admin accounts:');
    const allAdmins = await Agent.findAll({
      where: { 
        role: 'admin'
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'isActive']
    });

    allAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.firstName} ${admin.lastName} (${admin.email}) - Active: ${admin.isActive ? 'Yes' : 'No'}`);
    });
    
  } catch (error) {
    console.error('Error counting agents:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the function
countActualAgents().catch(console.error); 
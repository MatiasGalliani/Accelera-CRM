import { Agent, AgentLeadSource } from './models/leads-index.js';
import sequelize from './config/database.js';

/**
 * Count agents with access to aimedici lead source
 */
async function countAimediciAgents() {
  try {
    console.log('Counting agents with access to aimedici source...');
    
    // Find all agent lead sources for aimedici
    const aimediciAgentSources = await AgentLeadSource.findAll({
      where: { source: 'aimedici' },
      include: [{ 
        model: Agent, 
        attributes: ['id', 'firstName', 'lastName', 'email', 'isActive'],
        where: { isActive: true } // Only include active agents
      }]
    });
    
    console.log(`\n✅ Found ${aimediciAgentSources.length} active agents with access to aimedici source:`);
    
    // Display the list of agents
    aimediciAgentSources.forEach((agentSource, index) => {
      console.log(`${index + 1}. ${agentSource.Agent.firstName} ${agentSource.Agent.lastName} (${agentSource.Agent.email})`);
    });

    // Now also show all agents for comparison
    console.log('\nListing all active agents in the system:');
    const allAgents = await Agent.findAll({
      where: { isActive: true },
      attributes: ['id', 'firstName', 'lastName', 'email']
    });

    allAgents.forEach((agent, index) => {
      console.log(`${index + 1}. ${agent.firstName} ${agent.lastName} (${agent.email})`);
    });
    
  } catch (error) {
    console.error('Error counting aimedici agents:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the function
countAimediciAgents().catch(console.error); 
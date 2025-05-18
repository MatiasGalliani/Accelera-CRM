import { Agent, AgentLeadSource } from './models/leads-index.js';
import sequelize from './config/database.js';

/**
 * Function to check if an agent has permissions to access specific lead sources
 * @param {string} email - Email of the agent to check
 */
async function checkAgentSources(email) {
  try {
    console.log(`Looking for agent with email: ${email}`);
    
    // Find the agent by email
    const agent = await Agent.findOne({
      where: { email },
      include: [{ model: AgentLeadSource }]
    });
    
    if (!agent) {
      console.log(`\n❌ No agent found with email: ${email}`);
      return;
    }
    
    console.log('\n✅ Agent found:');
    console.log(`ID: ${agent.id}`);
    console.log(`Firebase UID: ${agent.firebaseUid}`);
    console.log(`Name: ${agent.firstName} ${agent.lastName}`);
    console.log(`Email: ${agent.email}`);
    console.log(`Role: ${agent.role}`);
    console.log(`Active: ${agent.isActive ? 'Yes' : 'No'}`);
    
    // Check for lead sources
    console.log('\nAssigned lead sources:');
    if (agent.AgentLeadSources && agent.AgentLeadSources.length > 0) {
      agent.AgentLeadSources.forEach(source => {
        console.log(`- ${source.source}`);
      });
      
      // Check for specific sources
      const sources = agent.AgentLeadSources.map(source => source.source);
      
      // Check specifically for aimedici source
      const hasAimedici = sources.includes('aimedici');
      if (hasAimedici) {
        console.log('\n✅ Agent has access to "aimedici" source');
      } else {
        console.log('\n❌ Agent does NOT have access to "aimedici" source');
      }
      
      // Check specifically for aiquinto source
      const hasAiquinto = sources.includes('aiquinto');
      if (hasAiquinto) {
        console.log('✅ Agent has access to "aiquinto" source');
      } else {
        console.log('❌ Agent does NOT have access to "aiquinto" source');
      }
    } else {
      console.log('❌ Agent has no lead sources assigned');
    }
    
    // If the agent is an admin, they should see all sources
    if (agent.role === 'admin') {
      console.log('\nNote: This agent has "admin" role so should have access to all sources by default');
    }
  } catch (error) {
    console.error('Error checking agent sources:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Email of the agent to check
const agentEmail = 'matiasgalliani00@gmail.com';

// Run the check
checkAgentSources(agentEmail).catch(console.error); 
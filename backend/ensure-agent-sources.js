import { Agent, AgentLeadSource } from './models/leads-index.js';
import sequelize from './config/database.js';

/**
 * Ensure an agent has both aimedici and aiquinto sources
 * @param {string} email - Email of the agent
 */
async function ensureAgentSources(email) {
  const transaction = await sequelize.transaction();
  
  try {
    console.log(`Finding agent with email: ${email}`);
    
    // Find the agent by email
    const agent = await Agent.findOne({
      where: { email },
      include: [{ model: AgentLeadSource }],
      transaction
    });
    
    if (!agent) {
      console.log(`\n❌ No agent found with email: ${email}`);
      await transaction.rollback();
      return;
    }
    
    console.log('\n✅ Agent found:');
    console.log(`ID: ${agent.id}`);
    console.log(`Name: ${agent.firstName} ${agent.lastName}`);
    console.log(`Email: ${agent.email}`);
    
    // Get current sources
    const currentSources = agent.AgentLeadSources.map(source => source.source);
    console.log('Current sources:', currentSources);
    
    // Check for aiquinto
    if (!currentSources.includes('aiquinto')) {
      console.log('Adding aiquinto source...');
      await AgentLeadSource.create({
        agentId: agent.id,
        source: 'aiquinto'
      }, { transaction });
    } else {
      console.log('✓ Agent already has aiquinto source');
    }
    
    // Check for aimedici
    if (!currentSources.includes('aimedici')) {
      console.log('Adding aimedici source...');
      await AgentLeadSource.create({
        agentId: agent.id,
        source: 'aimedici'
      }, { transaction });
    } else {
      console.log('✓ Agent already has aimedici source');
    }
    
    // Commit changes
    await transaction.commit();
    console.log('\n✅ All changes committed successfully');
    
    // Verify changes
    const updatedAgent = await Agent.findOne({
      where: { email },
      include: [{ model: AgentLeadSource }]
    });
    
    const updatedSources = updatedAgent.AgentLeadSources.map(source => source.source);
    console.log('\nUpdated sources:', updatedSources);
    
    // Final check
    const hasAiquinto = updatedSources.includes('aiquinto');
    const hasAimedici = updatedSources.includes('aimedici');
    
    if (hasAiquinto && hasAimedici) {
      console.log('\n✅ SUCCESS: Agent now has both sources configured');
    } else {
      console.log('\n❌ ERROR: Agent is still missing some sources');
      if (!hasAiquinto) console.log('- Missing aiquinto');
      if (!hasAimedici) console.log('- Missing aimedici');
    }
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error ensuring agent sources:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Email of the agent
const agentEmail = 'matiasgalliani00@gmail.com';

// Run the function
ensureAgentSources(agentEmail).catch(console.error); 
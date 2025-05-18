import { Agent, AgentLeadSource } from './models/leads-index.js';
import sequelize from './config/database.js';

/**
 * Add aimedici source to an agent
 * @param {string} email - Email of the agent
 */
async function addAimediciSource(email) {
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
    
    // Check if agent already has aimedici source
    const hasAimedici = agent.AgentLeadSources.some(source => source.source === 'aimedici');
    
    if (hasAimedici) {
      console.log('\n⚠️ Agent already has access to "aimedici" source. No change needed.');
      await transaction.rollback();
      return;
    }
    
    // Add aimedici source to agent
    await AgentLeadSource.create({
      agentId: agent.id,
      source: 'aimedici'
    }, { transaction });
    
    await transaction.commit();
    console.log('\n✅ Successfully added "aimedici" source to agent');
    
    // Verify the change was made
    const updatedAgent = await Agent.findOne({
      where: { email },
      include: [{ model: AgentLeadSource }]
    });
    
    console.log('\nUpdated lead sources:');
    if (updatedAgent.AgentLeadSources && updatedAgent.AgentLeadSources.length > 0) {
      updatedAgent.AgentLeadSources.forEach(source => {
        console.log(`- ${source.source}`);
      });
    }
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error adding aimedici source:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Email of the agent - REPLACE WITH THE ACTUAL EMAIL
const agentEmail = 'matiasgalliani00@gmail.com'; // Replace with your email

// Run the function to add aimedici source
addAimediciSource(agentEmail).catch(console.error); 
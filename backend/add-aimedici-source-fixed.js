import { Agent, AgentLeadSource } from './models/leads-index.js';
import sequelize from './config/database.js';

/**
 * Add aimedici source to an agent with improved error handling
 * @param {string} email - Email of the agent
 */
async function addAimediciSource(email) {
  // No transaction yet - we'll create it after checking current state
  try {
    console.log(`Finding agent with email: ${email}`);
    
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
    console.log(`Name: ${agent.firstName} ${agent.lastName}`);
    console.log(`Email: ${agent.email}`);
    
    // Check if agent already has aimedici source
    const hasAimedici = agent.AgentLeadSources && 
                       agent.AgentLeadSources.some(source => source.source === 'aimedici');
    
    if (hasAimedici) {
      console.log('\n⚠️ Agent already has access to "aimedici" source. No change needed.');
      return;
    }
    
    // Now create a transaction for the update
    const transaction = await sequelize.transaction();
    
    try {
      // Add aimedici source to agent
      const newSource = await AgentLeadSource.create({
        agentId: agent.id,
        source: 'aimedici'
      }, { transaction });
      
      console.log('Created new source record with ID:', newSource.id);
      
      await transaction.commit();
      console.log('\n✅ Successfully added "aimedici" source to agent');
    } catch (txError) {
      // If there's an error in the transaction
      await transaction.rollback();
      console.error('Transaction error:', txError);
      throw txError;
    }
    
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
      
      // Double check for aimedici
      const nowHasAimedici = updatedAgent.AgentLeadSources.some(source => 
        source.source === 'aimedici');
      
      if (nowHasAimedici) {
        console.log('\n✅ Confirmed: Agent now has access to "aimedici" source');
      } else {
        console.log('\n❌ Error: Agent still does NOT have access to "aimedici" source');
      }
    } else {
      console.log('❌ Agent has no lead sources assigned');
    }
    
  } catch (error) {
    console.error('Error adding aimedici source:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Email of the agent
const agentEmail = 'matiasgalliani00@gmail.com';

// Run the function to add aimedici source
addAimediciSource(agentEmail).catch(console.error); 
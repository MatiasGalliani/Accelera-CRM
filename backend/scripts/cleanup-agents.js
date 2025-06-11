import { Agent, AgentLeadSource, Lead } from '../models/leads-index.js';
import admin from 'firebase-admin';

async function cleanupAgents() {
  try {
    // Get all agents
    const agents = await Agent.findAll();
    console.log(`Found ${agents.length} agents in database`);

    // Check each agent against Firebase
    for (const agent of agents) {
      try {
        // Try to get user from Firebase
        await admin.auth().getUser(agent.firebaseUid);
        console.log(`Agent ${agent.email} exists in Firebase`);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          console.log(`Found orphaned agent: ${agent.email} (${agent.firebaseUid})`);
          
          // Start transaction
          const transaction = await Agent.sequelize.transaction();
          
          try {
            // Delete agent's lead sources
            await AgentLeadSource.destroy({
              where: { agentId: agent.id },
              transaction
            });
            
            // Update any leads assigned to this agent
            await Lead.update(
              { assignedAgentId: null },
              { where: { assignedAgentId: agent.id }, transaction }
            );
            
            // Delete the agent
            await agent.destroy({ transaction });
            
            // Commit transaction
            await transaction.commit();
            console.log(`Successfully cleaned up orphaned agent ${agent.email}`);
          } catch (err) {
            // Rollback transaction on error
            await transaction.rollback();
            console.error(`Error cleaning up agent ${agent.email}:`, err);
          }
        }
      }
    }

    // Find and handle duplicate agents
    const duplicateEmails = await Agent.findAll({
      attributes: ['email'],
      group: ['email'],
      having: Agent.sequelize.literal('COUNT(*) > 1')
    });

    for (const { email } of duplicateEmails) {
      const duplicates = await Agent.findAll({
        where: { email },
        order: [['created_at', 'DESC']]
      });

      // Keep the most recent one, delete others
      const [keep, ...remove] = duplicates;
      console.log(`Found ${duplicates.length} duplicates for ${email}, keeping most recent`);

      for (const agent of remove) {
        const transaction = await Agent.sequelize.transaction();
        try {
          // Delete agent's lead sources
          await AgentLeadSource.destroy({
            where: { agentId: agent.id },
            transaction
          });
          
          // Update any leads assigned to this agent
          await Lead.update(
            { assignedAgentId: keep.id },
            { where: { assignedAgentId: agent.id }, transaction }
          );
          
          // Delete the duplicate agent
          await agent.destroy({ transaction });
          
          await transaction.commit();
          console.log(`Successfully removed duplicate agent ${agent.email}`);
        } catch (err) {
          await transaction.rollback();
          console.error(`Error removing duplicate agent ${agent.email}:`, err);
        }
      }
    }

    console.log('Cleanup completed');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Run the cleanup
cleanupAgents(); 
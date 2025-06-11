import { Agent, AgentLeadSource, Lead } from '../models/leads-index.js';

const agentIdsToDelete = [24, 49];

async function deleteSpecificAgents() {
  for (const id of agentIdsToDelete) {
    const transaction = await Agent.sequelize.transaction();
    try {
      await AgentLeadSource.destroy({ where: { agentId: id }, transaction });
      await Lead.update({ assignedAgentId: null }, { where: { assignedAgentId: id }, transaction });
      await Agent.destroy({ where: { id }, transaction });
      await transaction.commit();
      console.log(`Deleted agent with ID: ${id}`);
    } catch (err) {
      await transaction.rollback();
      console.error(`Error deleting agent with ID ${id}:`, err);
    }
  }
  console.log('Specific agents deleted.');
}

deleteSpecificAgents(); 
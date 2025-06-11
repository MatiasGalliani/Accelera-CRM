import { Agent, AgentLeadSource, Lead } from '../models/leads-index.js';

async function deleteAgent49() {
  const transaction = await Agent.sequelize.transaction();
  try {
    await AgentLeadSource.destroy({ where: { agentId: 49 }, transaction });
    await Lead.update({ assignedAgentId: null }, { where: { assignedAgentId: 49 }, transaction });
    await Agent.destroy({ where: { id: 49 }, transaction });
    await transaction.commit();
    console.log('Agent ID 49 deleted successfully.');
  } catch (err) {
    await transaction.rollback();
    console.error('Error deleting agent ID 49:', err);
  }
}

deleteAgent49(); 
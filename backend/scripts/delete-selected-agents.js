import { Agent, AgentLeadSource, Lead } from '../models/leads-index.js';

const emailsToDelete = [
  'marcoalbertin@creditplan.it',
  'marziavinciguerra@creditplan.it',
  'giampaoloscaramella@creditplan.it',
  'andreadavi@creditplan.it',
  'andreafriggieri@crediplan.it',
  'pepe@pepe.it',
  'qwdewqe@qwedqwe.com',
  '2132132@pepe.ot',
  '12321313@creditplan.it',
  'prova.agente@creditplan.it',
  '1232131@creditplan.it',
  '21212@creditplan.it',
  '213213213@creditplan.it',
  '123456@gmail.com',
  'Creditplan@it.it',
  'itaca@gmail.com'
];

async function deleteSelectedAgents() {
  for (const email of emailsToDelete) {
    const agents = await Agent.findAll({ where: { email } });
    for (const agent of agents) {
      const transaction = await Agent.sequelize.transaction();
      try {
        await AgentLeadSource.destroy({ where: { agentId: agent.id }, transaction });
        await Lead.update({ assignedAgentId: null }, { where: { assignedAgentId: agent.id }, transaction });
        await agent.destroy({ transaction });
        await transaction.commit();
        console.log(`Deleted agent: ${email} (ID: ${agent.id})`);
      } catch (err) {
        await transaction.rollback();
        console.error(`Error deleting agent ${email} (ID: ${agent.id}):`, err);
      }
    }
  }
  console.log('Selected agents deleted.');
}

deleteSelectedAgents(); 
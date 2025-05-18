import Agent from './Agent.js';
import AgentPage from './AgentPage.js';
import AgentLeadSource from './AgentLeadSource.js';
import Lead from './Lead.js';
import LeadDetail from './LeadDetail.js';
import LeadNote from './LeadNote.js';
import LeadStatusHistory from './LeadStatusHistory.js';

// Definir relaciones
Agent.hasMany(AgentPage, { foreignKey: 'agentId' });
AgentPage.belongsTo(Agent, { foreignKey: 'agentId' });

Agent.hasMany(AgentLeadSource, { foreignKey: 'agentId' });
AgentLeadSource.belongsTo(Agent, { foreignKey: 'agentId' });

Agent.hasMany(Lead, { foreignKey: 'assignedAgentId', as: 'leads' });
Lead.belongsTo(Agent, { foreignKey: 'assignedAgentId', as: 'assignedAgent' });

Lead.hasOne(LeadDetail, { foreignKey: 'leadId', as: 'details' });
LeadDetail.belongsTo(Lead, { foreignKey: 'leadId' });

Lead.hasMany(LeadNote, { foreignKey: 'leadId', as: 'notes' });
LeadNote.belongsTo(Lead, { foreignKey: 'leadId' });
LeadNote.belongsTo(Agent, { foreignKey: 'agentId' });

Lead.hasMany(LeadStatusHistory, { foreignKey: 'leadId', as: 'statusHistory' });
LeadStatusHistory.belongsTo(Lead, { foreignKey: 'leadId' });
LeadStatusHistory.belongsTo(Agent, { foreignKey: 'agentId' });

export {
  Agent,
  AgentPage,
  AgentLeadSource,
  Lead,
  LeadDetail,
  LeadNote,
  LeadStatusHistory
}; 
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AgentLeadSource = sequelize.define('AgentLeadSource', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  agentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'agent_id'
  },
  source: {
    type: DataTypes.STRING(50),
    allowNull: false
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  tableName: 'agent_lead_sources'
});

export default AgentLeadSource; 
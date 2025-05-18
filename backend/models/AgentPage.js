import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AgentPage = sequelize.define('AgentPage', {
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
  pageRoute: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'page_route'
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  tableName: 'agent_pages'
});

export default AgentPage; 
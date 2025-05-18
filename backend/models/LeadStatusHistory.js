import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const LeadStatusHistory = sequelize.define('LeadStatusHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  leadId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'lead_id'
  },
  agentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'agent_id'
  },
  oldStatus: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'old_status'
  },
  newStatus: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'new_status'
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  tableName: 'lead_status_history'
});

export default LeadStatusHistory; 
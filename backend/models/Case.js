import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Case = sequelize.define('Case', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  caseNumber: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'new'
  },
  priority: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'medium'
  },
  assignedAgentId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  clientId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  tableName: 'cases'
});

export default Case; 
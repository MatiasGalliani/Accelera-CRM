import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const CaseStatusHistory = sequelize.define('CaseStatusHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  caseId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  oldStatus: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  newStatus: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  changedById: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  timestamps: true,
  createdAt: 'changed_at',
  updatedAt: false
});

export default CaseStatusHistory; 
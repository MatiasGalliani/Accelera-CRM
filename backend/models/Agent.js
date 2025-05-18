import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Agent = sequelize.define('Agent', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  firebaseUid: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'firebase_uid'
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'first_name'
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'last_name'
  },
  role: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'agent'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  calendlyUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'calendly_url'
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  tableName: 'agents'
});

export default Agent; 
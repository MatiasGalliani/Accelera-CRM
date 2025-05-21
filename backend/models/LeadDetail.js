import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const LeadDetail = sequelize.define('LeadDetail', {
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
  requestedAmount: {
    type: DataTypes.DECIMAL,
    allowNull: true,
    field: 'requested_amount'
  },
  netSalary: {
    type: DataTypes.DECIMAL,
    allowNull: true,
    field: 'net_salary'
  },
  employeeType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'employee_type'
  },
  contractType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'contract_type'
  },
  employmentSubtype: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'employment_subtype'
  },
  birthDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'birth_date'
  },
  residenceCity: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'residence_city'
  },
  residenceProvince: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'residence_province'
  },
  financingPurpose: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'financing_purpose'
  },
  companyName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'company_name'
  },
  legalCity: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'legal_city'
  },
  operationalCity: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'operational_city'
  },
  employmentDate: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'employment_date'
  },
  employeeCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'employee_count'
  },
  pensionEntity: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'pension_entity'
  },
  pensionType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'pension_type'
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  tableName: 'lead_details'
});

export default LeadDetail; 
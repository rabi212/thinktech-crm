import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Company from './company.js';

const CustomerMaster = sequelize.define('CustomerMaster', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  customerCode: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: false
  },
  customerName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true }
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contactPerson: {
    type: DataTypes.STRING,
    allowNull: true
  },
  mobileNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  gstNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  billingAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  shippingAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'India'
  },
  creditLimit: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  paymentTerms: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Immediate'
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive'),
    defaultValue: 'Active',
    allowNull: false
  },
  customFields: {
    type: DataTypes.JSON,
    allowNull: true
  },
  CompanyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Company,
      key: 'id'
    }
  }
}, {
  timestamps: true
});

export default CustomerMaster;

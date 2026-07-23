import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Company from './company.js';
import CustomerMaster from './customerMaster.js';

const CustomerPurchaseOrder = sequelize.define('CustomerPurchaseOrder', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  poNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  poDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  poAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  poFilePath: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'Active',
    allowNull: false
  },
  customFields: {
    type: DataTypes.JSON,
    allowNull: true
  },
  CustomerMasterId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: CustomerMaster,
      key: 'id'
    }
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

export default CustomerPurchaseOrder;

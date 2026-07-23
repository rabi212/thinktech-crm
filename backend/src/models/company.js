import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Company = sequelize.define('Company', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Active', 'Inactive'),
    defaultValue: 'Pending',
    allowNull: false
  },
  // ERP Configuration Settings
  financialYear: {
    type: DataTypes.STRING,
    defaultValue: '2026-2027',
    allowNull: false
  },
  gstNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  taxRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 18.00,
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'INR',
    allowNull: false
  },
  customFields: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  timestamps: true
});

export default Company;

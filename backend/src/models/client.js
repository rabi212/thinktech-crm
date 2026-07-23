import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Company from './company.js';

const Client = sequelize.define('Client', {
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
  contact: {
    type: DataTypes.STRING,
    allowNull: true
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
  status: {
    type: DataTypes.ENUM('Lead', 'Active', 'Inactive'),
    defaultValue: 'Lead',
    allowNull: false
  },
  CompanyId: {
    type: DataTypes.INTEGER,
    allowNull: false, // Every client must belong to a company
    references: {
      model: Company,
      key: 'id'
    }
  }
}, {
  timestamps: true
});

export default Client;

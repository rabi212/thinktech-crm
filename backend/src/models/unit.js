import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Company from './company.js';

const Unit = sequelize.define('Unit', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  unitCode: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive'),
    allowNull: false,
    defaultValue: 'Active'
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

export default Unit;

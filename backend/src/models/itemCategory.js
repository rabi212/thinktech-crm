import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Company from './company.js';

const ItemCategory = sequelize.define('ItemCategory', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  categoryCode: {
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
  description: {
    type: DataTypes.TEXT,
    allowNull: true
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

export default ItemCategory;

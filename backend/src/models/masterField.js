import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Company from './company.js';

const MasterField = sequelize.define('MasterField', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  CompanyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Company,
      key: 'id'
    }
  },
  module: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  fieldName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  label: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'text'
  },
  options: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  required: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  visible: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  isCustom: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  timestamps: true
});

export default MasterField;

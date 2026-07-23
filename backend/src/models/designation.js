import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Company from './company.js';

const Designation = sequelize.define('Designation', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  designationCode: {
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

export default Designation;

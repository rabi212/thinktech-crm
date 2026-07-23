import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Company from './company.js';
import EmployeeMaster from './employeeMaster.js';

const Lead = sequelize.define('Lead', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  leadCode: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: false
  },
  leadTitle: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contactName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  leadSource: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Direct'
  },
  leadStatus: {
    type: DataTypes.STRING,
    defaultValue: 'New',
    allowNull: false
  },
  estimatedValue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  AssignedToId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: EmployeeMaster,
      key: 'id'
    }
  },
  lastFollowUpDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  nextFollowUpDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lostReason: {
    type: DataTypes.STRING,
    allowNull: true
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

export default Lead;

import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Company from './company.js';
import CustomerMaster from './customerMaster.js';
import EmployeeMaster from './employeeMaster.js';

const Enquiry = sequelize.define('Enquiry', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  enquiryNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: false
  },
  enquiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  CustomerMasterId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: CustomerMaster,
      key: 'id'
    }
  },
  contactName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  productService: {
    type: DataTypes.STRING,
    allowNull: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  expectedClosingDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  AssignedToId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: EmployeeMaster,
      key: 'id'
    }
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'New'
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  estimatedValue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
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

export default Enquiry;

import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Company from './company.js';

const Vendor = sequelize.define('Vendor', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  vendorCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  vendorName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true }
  },
  vendorType: {
    type: DataTypes.ENUM('Supplier', 'Contractor', 'Service Provider', 'Consultant'),
    defaultValue: 'Supplier',
    allowNull: false
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Contact details
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
  // Address details
  address: {
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
  pinCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Tax compliance
  gstNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  panNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  msmeNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  vendorCategory: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Banking details
  bankName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bankAccountNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ifscCode: {
    type: DataTypes.STRING,
    allowNull: true
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

export default Vendor;

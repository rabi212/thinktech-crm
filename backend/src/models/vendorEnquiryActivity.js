import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import VendorEnquiry from './vendorEnquiry.js';
import User from './user.js';
import Company from './company.js';

const VendorEnquiryActivity = sequelize.define('VendorEnquiryActivity', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  VendorEnquiryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: VendorEnquiry,
      key: 'id'
    }
  },
  activityType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Note'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  followUpDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  CreatedByUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
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

export default VendorEnquiryActivity;

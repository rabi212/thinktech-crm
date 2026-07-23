import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Enquiry from './enquiry.js';
import User from './user.js';
import Company from './company.js';

const EnquiryActivity = sequelize.define('EnquiryActivity', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  EnquiryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Enquiry,
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

export default EnquiryActivity;

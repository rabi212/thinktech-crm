import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Enquiry from './enquiry.js';
import Company from './company.js';

const EnquiryAttachment = sequelize.define('EnquiryAttachment', {
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
  fileName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fileMime: {
    type: DataTypes.STRING,
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

export default EnquiryAttachment;

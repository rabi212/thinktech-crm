import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import VendorEnquiry from './vendorEnquiry.js';
import Company from './company.js';

const VendorEnquiryAttachment = sequelize.define('VendorEnquiryAttachment', {
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

export default VendorEnquiryAttachment;

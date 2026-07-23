import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Company from './company.js';
import Enquiry from './enquiry.js';
import CustomerMaster from './customerMaster.js';

const Quotation = sequelize.define('Quotation', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  quotationNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  CustomerMasterId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: CustomerMaster,
      key: 'id'
    }
  },
  clientName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  validityDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  termsConditions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  items: {
    type: DataTypes.JSON,
    allowNull: true
  },
  revisionNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  parentQuotationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Quotations',
      key: 'id'
    }
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Draft',
    allowNull: false
  },
  customFields: {
    type: DataTypes.JSON,
    allowNull: true
  },
  EnquiryId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Enquiry,
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

export default Quotation;

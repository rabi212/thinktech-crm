import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Company from './company.js';
import Invoice from './invoice.js';
import CreditNote from './creditNote.js';

const SalesReturn = sequelize.define('SalesReturn', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  returnNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  returnDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  items: {
    type: DataTypes.JSON,
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  customFields: {
    type: DataTypes.JSON,
    allowNull: true
  },
  InvoiceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Invoice,
      key: 'id'
    }
  },
  CreditNoteId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: CreditNote,
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

export default SalesReturn;

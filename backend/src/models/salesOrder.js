import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Company from './company.js';
import CustomerMaster from './customerMaster.js';
import CustomerPurchaseOrder from './customerPurchaseOrder.js';
import Quotation from './quotation.js';

const SalesOrder = sequelize.define('SalesOrder', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  soNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  soDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  items: {
    type: DataTypes.JSON,
    allowNull: true
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  status: {
    type: DataTypes.ENUM('Draft', 'Pending Approval', 'Approved', 'Dispatched', 'Closed', 'Cancelled'),
    defaultValue: 'Draft',
    allowNull: false
  },
  customFields: {
    type: DataTypes.JSON,
    allowNull: true
  },
  CustomerMasterId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: CustomerMaster,
      key: 'id'
    }
  },
  CustomerPurchaseOrderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: CustomerPurchaseOrder,
      key: 'id'
    }
  },
  QuotationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Quotation,
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

export default SalesOrder;

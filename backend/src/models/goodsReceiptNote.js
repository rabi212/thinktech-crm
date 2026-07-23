import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const GoodsReceiptNote = sequelize.define('GoodsReceiptNote', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  grnNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  grnDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  PurchaseOrderId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  WarehouseId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  VendorId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  challanNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  challanDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  transporter: {
    type: DataTypes.STRING,
    allowNull: true
  },
  vehicleNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  receivedDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'Scheduled',
    allowNull: false
  },
  items: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '[{itemId, poQty, receivedQty, acceptedQty, rejectedQty, batchNo, expiryDate, locationId, remarks}]'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  customFields: {
    type: DataTypes.JSON,
    allowNull: true
  },
  CompanyId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  timestamps: true
});

export const generateGRNCode = async (companyId) => {
  const year = new Date().getFullYear();
  const count = await GoodsReceiptNote.count({ where: { CompanyId: companyId } });
  const nextNum = String(count + 1).padStart(4, '0');
  return `GRN-${year}-${nextNum}`;
};

export default GoodsReceiptNote;
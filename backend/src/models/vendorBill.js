import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const VendorBill = sequelize.define('VendorBill', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  billNumber: { type: DataTypes.STRING, allowNull: false },
  billDate: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  VendorId: { type: DataTypes.INTEGER, allowNull: false },
  PurchaseOrderId: { type: DataTypes.INTEGER, allowNull: true },
  GRNId: { type: DataTypes.INTEGER, allowNull: true },
  dueDate: { type: DataTypes.DATEONLY, allowNull: true },
  billAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  taxAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  totalAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  status: { type: DataTypes.STRING(50), defaultValue: 'Pending', allowNull: false },
  paymentStatus: { type: DataTypes.STRING(20), defaultValue: 'Unpaid' },
  remarks: { type: DataTypes.TEXT, allowNull: true },
  customFields: { type: DataTypes.JSON, allowNull: true },
  CompanyId: { type: DataTypes.INTEGER, allowNull: false }
}, { timestamps: true });

export const generateBillCode = async (companyId) => {
  const year = new Date().getFullYear();
  const count = await VendorBill.count({ where: { CompanyId: companyId } });
  return `VBILL-${year}-${String(count + 1).padStart(4, '0')}`;
};

export default VendorBill;
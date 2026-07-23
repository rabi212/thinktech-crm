import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const PurchaseOrder = sequelize.define('PurchaseOrder', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  poNumber: { type: DataTypes.STRING, allowNull: false },
  poDate: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  VendorId: { type: DataTypes.INTEGER, allowNull: false },
  VendorQuotationId: { type: DataTypes.INTEGER, allowNull: true },
  PurchaseRequisitionId: { type: DataTypes.INTEGER, allowNull: true },
  WarehouseId: { type: DataTypes.INTEGER, allowNull: true },
  expectedDate: { type: DataTypes.DATEONLY, allowNull: true },
  paymentTerms: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.STRING(50), defaultValue: 'Draft', allowNull: false },
  items: { type: DataTypes.JSON, allowNull: true },
  totalAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  remarks: { type: DataTypes.TEXT, allowNull: true },
  customFields: { type: DataTypes.JSON, allowNull: true },
  CustomerId: { type: DataTypes.INTEGER, allowNull: true },
  poFilePath: { type: DataTypes.STRING, allowNull: true },
  CompanyId: { type: DataTypes.INTEGER, allowNull: false }
}, { timestamps: true });

export const generatePOCode = async (companyId) => {
  const year = new Date().getFullYear();
  const count = await PurchaseOrder.count({ where: { CompanyId: companyId } });
  return `PO-${year}-${String(count + 1).padStart(4, '0')}`;
};

export default PurchaseOrder;
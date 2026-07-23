import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const PurchaseRequisition = sequelize.define('PurchaseRequisition', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  requisitionNumber: { type: DataTypes.STRING, allowNull: false },
  requisitionDate: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  RequestedById: { type: DataTypes.INTEGER, allowNull: false },
  DepartmentId: { type: DataTypes.INTEGER, allowNull: true },
  WarehouseId: { type: DataTypes.INTEGER, allowNull: true },
  requiredDate: { type: DataTypes.DATEONLY, allowNull: true },
  priority: { type: DataTypes.STRING(20), defaultValue: 'Medium' },
  status: { type: DataTypes.STRING(50), defaultValue: 'Draft', allowNull: false },
  items: { type: DataTypes.JSON, allowNull: true },
  totalAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  remarks: { type: DataTypes.TEXT, allowNull: true },
  customFields: { type: DataTypes.JSON, allowNull: true },
  CompanyId: { type: DataTypes.INTEGER, allowNull: false }
}, { timestamps: true });

export const generateRequisitionCode = async (companyId) => {
  const year = new Date().getFullYear();
  const count = await PurchaseRequisition.count({ where: { CompanyId: companyId } });
  return `PR-${year}-${String(count + 1).padStart(4, '0')}`;
};

export default PurchaseRequisition;
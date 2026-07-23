import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const PurchaseApproval = sequelize.define('PurchaseApproval', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  approvalCode: { type: DataTypes.STRING, allowNull: false },
  module: { type: DataTypes.ENUM('PurchaseRequisition', 'PurchaseOrder', 'VendorBill', 'VendorPayment'), allowNull: false },
  referenceId: { type: DataTypes.INTEGER, allowNull: false },
  referenceType: { type: DataTypes.STRING(50), allowNull: false },
  currentLevel: { type: DataTypes.INTEGER, defaultValue: 1 },
  totalLevels: { type: DataTypes.INTEGER, defaultValue: 1 },
  status: { type: DataTypes.STRING(50), defaultValue: 'Pending', allowNull: false },
  approvers: { type: DataTypes.JSON, allowNull: true, comment: '[{level, userId, role, action, comments, timestamp}]' },
  initiatedBy: { type: DataTypes.INTEGER, allowNull: false },
  initiatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  completedAt: { type: DataTypes.DATE, allowNull: true },
  remarks: { type: DataTypes.TEXT, allowNull: true },
  customFields: { type: DataTypes.JSON, allowNull: true },
  CompanyId: { type: DataTypes.INTEGER, allowNull: false }
}, { timestamps: true });

export const generateApprovalCode = async (companyId) => {
  const year = new Date().getFullYear();
  const count = await PurchaseApproval.count({ where: { CompanyId: companyId } });
  return `APR-${year}-${String(count + 1).padStart(4, '0')}`;
};

export default PurchaseApproval;
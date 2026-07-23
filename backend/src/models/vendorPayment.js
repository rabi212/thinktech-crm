import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const VendorPayment = sequelize.define('VendorPayment', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  paymentNumber: { type: DataTypes.STRING, allowNull: false },
  paymentDate: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  VendorId: { type: DataTypes.INTEGER, allowNull: false },
  VendorBillId: { type: DataTypes.INTEGER, allowNull: true },
  amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  mode: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'Bank Transfer' },
  referenceNumber: { type: DataTypes.STRING, allowNull: true },
  bankName: { type: DataTypes.STRING, allowNull: true },
  chequeDate: { type: DataTypes.DATEONLY, allowNull: true },
  clearingDate: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.STRING(50), defaultValue: 'Pending', allowNull: false },
  remarks: { type: DataTypes.TEXT, allowNull: true },
  customFields: { type: DataTypes.JSON, allowNull: true },
  CompanyId: { type: DataTypes.INTEGER, allowNull: false }
}, { timestamps: true });

export const generatePaymentCode = async (companyId) => {
  const year = new Date().getFullYear();
  const count = await VendorPayment.count({ where: { CompanyId: companyId } });
  return `VPAY-${year}-${String(count + 1).padStart(4, '0')}`;
};

export default VendorPayment;
import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const VendorEnquiry = sequelize.define('VendorEnquiry', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  enquiryNumber: { type: DataTypes.STRING, allowNull: false },
  enquiryDate: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  VendorId: { type: DataTypes.INTEGER, allowNull: false },
  contactPerson: { type: DataTypes.STRING, allowNull: true },
  mobileNumber: { type: DataTypes.STRING, allowNull: true },
  email: { type: DataTypes.STRING, allowNull: true },
  productService: { type: DataTypes.STRING, allowNull: true },
  quantity: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  expectedClosingDate: { type: DataTypes.DATEONLY, allowNull: true },
  AssignedToId: { type: DataTypes.INTEGER, allowNull: true },
  priority: { type: DataTypes.STRING(20), defaultValue: 'Medium' },
  status: { type: DataTypes.STRING(50), defaultValue: 'New', allowNull: false },
  estimatedValue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  details: { type: DataTypes.TEXT, allowNull: true },
  items: { type: DataTypes.JSON, allowNull: true },
  totalAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  remarks: { type: DataTypes.TEXT, allowNull: true },
  customFields: { type: DataTypes.JSON, allowNull: true },
  CompanyId: { type: DataTypes.INTEGER, allowNull: false }
}, { timestamps: true });

export const generateEnquiryCode = async (companyId) => {
  const year = new Date().getFullYear();
  const count = await VendorEnquiry.count({ where: { CompanyId: companyId } });
  return `VENQ-${year}-${String(count + 1).padStart(4, '0')}`;
};

export default VendorEnquiry;
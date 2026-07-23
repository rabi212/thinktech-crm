import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/db.js';

const VendorQuotation = sequelize.define('VendorQuotation', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  quotationNumber: { type: DataTypes.STRING, allowNull: false },
  quotationDate: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  VendorId: { type: DataTypes.INTEGER, allowNull: false },
  VendorEnquiryId: { type: DataTypes.INTEGER, allowNull: true },
  validityDate: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.STRING(50), defaultValue: 'Draft', allowNull: false },
  termsConditions: { type: DataTypes.TEXT, allowNull: true },
  remarks: { type: DataTypes.TEXT, allowNull: true },
  items: { type: DataTypes.JSON, allowNull: true },
  totalAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  revisionNumber: { type: DataTypes.INTEGER, defaultValue: 0 },
  parentQuotationId: { type: DataTypes.INTEGER, allowNull: true },
  customFields: { type: DataTypes.JSON, allowNull: true },
  CompanyId: { type: DataTypes.INTEGER, allowNull: false }
}, { timestamps: true });

export const generateQuotationCode = async (companyId, parentId = null) => {
  const year = new Date().getFullYear();
  if (parentId) {
    const parent = await VendorQuotation.findOne({ where: { id: parentId, CompanyId: companyId } });
    if (parent) {
      const revisionsCount = await VendorQuotation.count({
        where: {
          [Op.or]: [{ id: parentId }, { parentQuotationId: parentId }],
          CompanyId: companyId
        }
      });
      const baseNum = parent.quotationNumber.split('-R')[0];
      return `${baseNum}-R${revisionsCount}`;
    }
  }
  const count = await VendorQuotation.count({ where: { CompanyId: companyId, parentQuotationId: null } });
  return `VQT-${year}-${String(count + 1).padStart(4, '0')}`;
};

export default VendorQuotation;
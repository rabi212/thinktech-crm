import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Company from './company.js';
import ItemCategory from './itemCategory.js';

const Item = sequelize.define('Item', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  itemCode: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  ItemCategoryId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: ItemCategory,
      key: 'id'
    }
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: true
  },
  purchasePrice: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  sellingPrice: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  gstPercent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 18.00
  },
  discountPercent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  hsnSacCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  trackingType: {
    type: DataTypes.ENUM('None', 'Batch', 'Lot', 'Serial'),
    allowNull: false,
    defaultValue: 'None'
  },
  hasExpiry: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  reorderLevel: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive'),
    allowNull: false,
    defaultValue: 'Active'
  },
  customFields: {
    type: DataTypes.JSON,
    allowNull: true
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

export default Item;

import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Item from './item.js';
import Warehouse from './warehouse.js';
import Company from './company.js';
import User from './user.js';

const StockMovement = sequelize.define('StockMovement', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  movementType: {
    type: DataTypes.ENUM('Inward', 'Outward', 'Transfer', 'Consumption'),
    allowNull: false
  },
  movementNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  referenceId: {
    type: DataTypes.STRING,
    allowNull: true // e.g. GRN number, invoice number, etc.
  },
  ItemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Item,
      key: 'id'
    }
  },
  fromWarehouseId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Warehouse,
      key: 'id'
    }
  },
  toWarehouseId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Warehouse,
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  batchNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lotNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  serialNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  movementDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  CreatedByUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
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

export default StockMovement;

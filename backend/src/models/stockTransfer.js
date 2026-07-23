import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Warehouse from './warehouse.js';
import Company from './company.js';

const StockTransfer = sequelize.define('StockTransfer', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  transferNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: false
  },
  transferDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  fromWarehouseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Warehouse,
      key: 'id'
    }
  },
  toWarehouseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Warehouse,
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('Draft', 'Pending', 'In Transit', 'Completed', 'Cancelled'),
    allowNull: false,
    defaultValue: 'Draft'
  },
  items: {
    type: DataTypes.JSON,
    allowNull: false // Array of transferred items: [{ ItemId, quantity, batchNumber, lotNumber, serialNumber }]
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

// Utility to generate unique stock transfer code
export async function generateTransferCode(companyId) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `ST-${dateStr}-`;
  
  // Find highest serial number for this prefix
  const lastTransfer = await StockTransfer.findOne({
    where: {
      CompanyId: companyId,
      transferNumber: {
        [sequelize.Sequelize.Op.like]: `${prefix}%`
      }
    },
    order: [['transferNumber', 'DESC']]
  });

  let nextSerial = 1;
  if (lastTransfer) {
    const parts = lastTransfer.transferNumber.split('-');
    const lastSerial = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSerial)) {
      nextSerial = lastSerial + 1;
    }
  }

  const serialStr = String(nextSerial).padStart(4, '0');
  return `${prefix}${serialStr}`;
}

export default StockTransfer;

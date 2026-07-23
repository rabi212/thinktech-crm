import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Warehouse from './warehouse.js';
import ProjectMaster from './projectMaster.js';
import Company from './company.js';

const MaterialConsumption = sequelize.define('MaterialConsumption', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  consumptionNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: false
  },
  consumptionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  WarehouseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Warehouse,
      key: 'id'
    }
  },
  ProjectId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: ProjectMaster,
      key: 'id'
    }
  },
  items: {
    type: DataTypes.JSON,
    allowNull: false // Array of consumed items: [{ ItemId, quantity, batchNumber, lotNumber, serialNumber }]
  },
  remarks: {
    type: DataTypes.TEXT,
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

// Utility to generate unique material consumption code
export async function generateConsumptionCode(companyId) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `MC-${dateStr}-`;
  
  // Find highest serial number for this prefix
  const lastConsumption = await MaterialConsumption.findOne({
    where: {
      CompanyId: companyId,
      consumptionNumber: {
        [sequelize.Sequelize.Op.like]: `${prefix}%`
      }
    },
    order: [['consumptionNumber', 'DESC']]
  });

  let nextSerial = 1;
  if (lastConsumption) {
    const parts = lastConsumption.consumptionNumber.split('-');
    const lastSerial = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSerial)) {
      nextSerial = lastSerial + 1;
    }
  }

  const serialStr = String(nextSerial).padStart(4, '0');
  return `${prefix}${serialStr}`;
}

export default MaterialConsumption;

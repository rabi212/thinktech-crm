import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Company from './company.js';
import Warehouse from './warehouse.js';

const Location = sequelize.define('Location', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  locationCode: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  locationType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  zone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  aisle: {
    type: DataTypes.STRING,
    allowNull: true
  },
  rack: {
    type: DataTypes.STRING,
    allowNull: true
  },
  shelf: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bin: {
    type: DataTypes.STRING,
    allowNull: true
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  capacityUnit: {
    type: DataTypes.STRING,
    allowNull: true
  },
  barcode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  allowMixedItems: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  tempControlled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  hazardousStorage: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  pickSequence: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  putawaySequence: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive'),
    defaultValue: 'Active',
    allowNull: false
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  customFields: {
    type: DataTypes.JSON,
    allowNull: true
  },
  WarehouseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Warehouse,
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

export default Location;

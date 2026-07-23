import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Company from './company.js';
import SalesOrder from './salesOrder.js';
import Warehouse from './warehouse.js';

const DispatchPlan = sequelize.define('DispatchPlan', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  dispatchNo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  plannedDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  items: {
    type: DataTypes.JSON,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'Scheduled',
    allowNull: false
  },
  customFields: {
    type: DataTypes.JSON,
    allowNull: true
  },
  SalesOrderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: SalesOrder,
      key: 'id'
    }
  },
  WarehouseId: {
    type: DataTypes.INTEGER,
    allowNull: true,
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

export default DispatchPlan;

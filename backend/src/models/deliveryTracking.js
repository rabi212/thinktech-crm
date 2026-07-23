import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Company from './company.js';
import DispatchPlan from './dispatchPlan.js';
import Vehicle from './vehicle.js';

const DeliveryTracking = sequelize.define('DeliveryTracking', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  trackingNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  courierPartner: {
    type: DataTypes.STRING,
    allowNull: true
  },
  shippedDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  deliveryStatus: {
    type: DataTypes.STRING(50),
    defaultValue: 'Pending',
    allowNull: false
  },
  actualDeliveryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  customFields: {
    type: DataTypes.JSON,
    allowNull: true
  },
  DispatchPlanId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: DispatchPlan,
      key: 'id'
    }
  },
  VehicleId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Vehicle,
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

export default DeliveryTracking;

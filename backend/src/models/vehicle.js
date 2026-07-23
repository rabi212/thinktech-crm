import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Company from './company.js';

const Vehicle = sequelize.define('Vehicle', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  vehicleCode: {
    type: DataTypes.STRING,
    allowNull: false
  },
  vehicleNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  vehicleName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  vehicleType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: true
  },
  model: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fuelType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true
  },
  chassisNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  engineNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  manufacturingYear: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  BranchId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Branches',
      key: 'id'
    }
  },
  AssignedDriverId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'EmployeeMasters',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive', 'Under Maintenance'),
    allowNull: false,
    defaultValue: 'Active'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  updatedBy: {
    type: DataTypes.STRING,
    allowNull: true
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

export default Vehicle;

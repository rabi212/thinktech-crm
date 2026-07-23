import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Company from './company.js';

const Asset = sequelize.define('Asset', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  assetCode: {
    type: DataTypes.STRING,
    allowNull: false
  },
  assetName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  assetCategory: {
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
  serialNumber: {
    type: DataTypes.STRING,
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
  DepartmentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Departments',
      key: 'id'
    }
  },
  AssignedEmployeeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'EmployeeMasters',
      key: 'id'
    }
  },
  purchaseDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  purchaseCost: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  VendorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Vendors',
      key: 'id'
    }
  },
  warrantyExpiry: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  LocationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Locations',
      key: 'id'
    }
  },
  assetStatus: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Active'
  },
  description: {
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

export default Asset;

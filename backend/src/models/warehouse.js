import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Company from './company.js';
import Branch from './branch.js';
import EmployeeMaster from './employeeMaster.js';

const Warehouse = sequelize.define('Warehouse', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  warehouseCode: {
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
  warehouseType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  contactPerson: {
    type: DataTypes.STRING,
    allowNull: true
  },
  mobileNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: {
        msg: "Must be a valid email address"
      }
    }
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  state: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  pincode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  addressLine1: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  addressLine2: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  storageCapacity: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  capacityUnit: {
    type: DataTypes.STRING,
    allowNull: true
  },
  defaultWarehouse: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  allowNegativeStock: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive'),
    defaultValue: 'Active',
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  customFields: {
    type: DataTypes.JSON,
    allowNull: true
  },
  BranchId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Branch,
      key: 'id'
    }
  },
  ManagerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: EmployeeMaster,
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

export default Warehouse;

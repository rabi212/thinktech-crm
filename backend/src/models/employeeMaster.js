import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Company from './company.js';
import Department from './department.js';
import Designation from './designation.js';
import User from './user.js';

const EmployeeMaster = sequelize.define('EmployeeMaster', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  employeeCode: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: false
  },
  employeeName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  mobile: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  joiningDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive'),
    defaultValue: 'Active',
    allowNull: false
  },
  CompanyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Company,
      key: 'id'
    }
  },
  DepartmentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Department,
      key: 'id'
    }
  },
  DesignationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Designation,
      key: 'id'
    }
  },
  BranchId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Branches',
      key: 'id'
    }
  },
  ReportingManagerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'EmployeeMasters',
      key: 'id'
    }
  },
  UserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    unique: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  customFields: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  timestamps: true
});

export default EmployeeMaster;

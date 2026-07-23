import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Company from './company.js';
import CustomerMaster from './customerMaster.js';
import EmployeeMaster from './employeeMaster.js';

const ProjectMaster = sequelize.define('ProjectMaster', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  projectCode: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: false
  },
  projectName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  projectValue: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Active', 'Completed', 'On Hold'),
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
  CustomerMasterId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: CustomerMaster,
      key: 'id'
    }
  },
  ProjectManagerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: EmployeeMaster,
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

export default ProjectMaster;

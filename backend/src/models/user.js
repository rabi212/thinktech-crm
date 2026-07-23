import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import bcrypt from 'bcryptjs';
import Company from './company.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  role: {
    type: DataTypes.ENUM('Superadmin', 'Admin', 'SalesExecutive', 'AccountsUser', 'Employee', 'Management'),
    defaultValue: 'Admin',
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive'),
    defaultValue: 'Active',
    allowNull: false
  },
  CompanyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Company,
      key: 'id'
    }
  },
  BranchId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  DepartmentId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  DesignationId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  employeeCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  mobile: {
    type: DataTypes.STRING,
    allowNull: true
  },
  joiningDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  ReportingManagerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  customFields: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default User;

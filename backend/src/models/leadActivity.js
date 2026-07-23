import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Lead from './lead.js';
import User from './user.js';
import Company from './company.js';

const LeadActivity = sequelize.define('LeadActivity', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  LeadId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Lead,
      key: 'id'
    }
  },
  activityType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Note'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  followUpDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  CreatedByUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
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

export default LeadActivity;

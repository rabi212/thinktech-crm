import express from 'express';
import { Op } from 'sequelize';
import User from '../models/user.js';
import Branch from '../models/branch.js';
import Department from '../models/department.js';
import Designation from '../models/designation.js';
import Company from '../models/company.js';
import EmployeeMaster from '../models/employeeMaster.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, requireRole(['Admin', 'Management']), async (req, res) => {
  try {
    const { includeAll } = req.query;
    let companyEmail = null;
    let parentUserId = null;

    if (req.user.CompanyId) {
      const company = await Company.findByPk(req.user.CompanyId);
      if (company) {
        companyEmail = company.email;
      }

      // Find the first registered user (lowest ID) for the company
      const parentUser = await User.findOne({
        where: { CompanyId: req.user.CompanyId },
        order: [['id', 'ASC']]
      });
      if (parentUser) {
        parentUserId = parentUser.id;
      }
    }

    const whereClause = { CompanyId: req.user.CompanyId };
    const excludeConditions = [];

    if (!includeAll && parentUserId) {
      excludeConditions.push({ id: { [Op.ne]: parentUserId } });
    }
    if (!includeAll && companyEmail) {
      excludeConditions.push({ email: { [Op.ne]: companyEmail } });
    }

    if (excludeConditions.length > 0) {
      whereClause[Op.and] = excludeConditions;
    }

    const users = await User.findAll({ 
      where: whereClause,
      attributes: ['id', 'name', 'email', 'role', 'status', 'createdAt', 'BranchId', 'DepartmentId', 'DesignationId', 'employeeCode', 'mobile', 'joiningDate', 'ReportingManagerId', 'customFields'],
      include: [
        { model: Branch, attributes: ['name'] },
        { model: Department, attributes: ['name'] },
        { model: Designation, attributes: ['name'] },
        { model: User, as: 'ReportingManager', attributes: ['id', 'name', 'employeeCode'] }
      ]
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { EmployeeMasterId, password, role, status, customFields } = req.body;
  try {
    if (!EmployeeMasterId) {
      return res.status(400).json({ error: 'Please select an employee from Employee Master.' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Login password is required.' });
    }

    const employee = await EmployeeMaster.findOne({
      where: { id: EmployeeMasterId, CompanyId: req.user.CompanyId }
    });
    if (!employee) {
      return res.status(404).json({ error: 'Selected employee not found.' });
    }
    if (employee.UserId) {
      return res.status(400).json({ error: 'Selected employee already has a login user.' });
    }
    if (!employee.email) {
      return res.status(400).json({ error: 'Selected employee must have an email address to create login.' });
    }

    const emailExists = await User.findOne({ where: { email: employee.email } });
    if (emailExists) {
      return res.status(400).json({ error: 'A user with this employee email already exists.' });
    }

    let reportingManagerUserId = null;
    if (employee.ReportingManagerId) {
      const reportingManager = await EmployeeMaster.findOne({
        where: { id: employee.ReportingManagerId, CompanyId: req.user.CompanyId }
      });
      reportingManagerUserId = reportingManager?.UserId || null;
    }

    const newUser = await User.create({
      name: employee.employeeName,
      email: employee.email,
      password,
      role: role || 'Employee',
      status: status || 'Active',
      CompanyId: req.user.CompanyId,
      BranchId: employee.BranchId || null,
      DepartmentId: employee.DepartmentId || null,
      DesignationId: employee.DesignationId || null,
      employeeCode: employee.employeeCode || null,
      mobile: employee.mobile || null,
      joiningDate: employee.joiningDate || null,
      ReportingManagerId: reportingManagerUserId,
      customFields: customFields || null
    });

    await employee.update({ UserId: newUser.id });
    
    const userWithIncludes = await User.findByPk(newUser.id, {
      include: [
        { model: Branch, attributes: ['name'] },
        { model: Department, attributes: ['name'] },
        { model: Designation, attributes: ['name'] },
        { model: User, as: 'ReportingManager', attributes: ['id', 'name', 'employeeCode'] }
      ]
    });
    res.status(201).json(userWithIncludes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create user. Email might be already in use.' });
  }
});

router.put('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { name, email, password, role, status, BranchId, DepartmentId, DesignationId, mobile, joiningDate, ReportingManagerId, employeeCode, customFields } = req.body;
  try {
    const userToEdit = await User.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!userToEdit) return res.status(404).json({ error: 'User not found' });

    let code = employeeCode;
    if (!code || code.trim() === '') {
      code = userToEdit.employeeCode;
    } else {
      code = code.trim();
    }

    const updateData = {
      name,
      email,
      role,
      status,
      BranchId: BranchId || null,
      DepartmentId: DepartmentId || null,
      DesignationId: DesignationId || null,
      employeeCode: code,
      mobile: mobile || null,
      joiningDate: joiningDate || null,
      ReportingManagerId: ReportingManagerId || null,
      customFields: customFields !== undefined ? customFields : userToEdit.customFields
    };

    if (password) {
      updateData.password = password;
    }

    await userToEdit.update(updateData);

    const userWithIncludes = await User.findByPk(userToEdit.id, {
      include: [
        { model: Branch, attributes: ['name'] },
        { model: Department, attributes: ['name'] },
        { model: Designation, attributes: ['name'] },
        { model: User, as: 'ReportingManager', attributes: ['id', 'name', 'employeeCode'] }
      ]
    });

    res.json(userWithIncludes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

export default router;

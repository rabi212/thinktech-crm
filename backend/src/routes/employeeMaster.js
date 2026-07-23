import express from 'express';
import { Op } from 'sequelize';
import EmployeeMaster from '../models/employeeMaster.js';
import Department from '../models/department.js';
import Designation from '../models/designation.js';
import User from '../models/user.js';
import Branch from '../models/branch.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper: generate next employee code for a company
const generateEmployeeCode = async (companyId) => {
  const count = await EmployeeMaster.count({ where: { CompanyId: companyId } });
  const nextNum = String(count + 1).padStart(4, '0');
  return `EMP-${nextNum}`;
};

// GET /api/master/employees — list all with optional search
router.get('/', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const { search } = req.query;
    const whereClause = { CompanyId: req.user.CompanyId };

    const includeClause = [
      { model: Department, attributes: ['id', 'name'] },
      { model: Designation, attributes: ['id', 'name'] },
      { model: Branch, attributes: ['id', 'name'] },
      { model: EmployeeMaster, as: 'ReportingManager', attributes: ['id', 'employeeName', 'employeeCode'] },
      { model: User, attributes: ['id', 'name', 'email'] }
    ];

    if (search) {
      whereClause[Op.or] = [
        { employeeName: { [Op.like]: `%${search}%` } },
        { employeeCode: { [Op.like]: `%${search}%` } },
        { mobile: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { '$Department.name$': { [Op.like]: `%${search}%` } },
        { '$Designation.name$': { [Op.like]: `%${search}%` } },
        { '$Branch.name$': { [Op.like]: `%${search}%` } }
      ];
    }

    const employees = await EmployeeMaster.findAll({
      where: whereClause,
      include: includeClause,
      order: [['createdAt', 'DESC']]
    });
    res.json(employees);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// GET /api/master/employees/:id — single employee
router.get('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const employee = await EmployeeMaster.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [
        { model: Department, attributes: ['id', 'name'] },
        { model: Designation, attributes: ['id', 'name'] },
        { model: Branch, attributes: ['id', 'name'] },
        { model: EmployeeMaster, as: 'ReportingManager', attributes: ['id', 'employeeName', 'employeeCode'] },
        { model: User, attributes: ['id', 'name', 'email'] }
      ]
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

// POST /api/master/employees — create
router.post('/', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const {
      employeeName, mobile, email, joiningDate, status,
      DepartmentId, DesignationId, BranchId, ReportingManagerId, UserId, employeeCode, customFields
    } = req.body;

    // Validate email uniqueness at user link if user is selected
    if (UserId) {
      const existingLink = await EmployeeMaster.findOne({ where: { UserId } });
      if (existingLink) {
        return res.status(400).json({ error: 'Selected User account is already linked to another employee.' });
      }
    }

    let code = employeeCode;
    if (!code || code.trim() === '') {
      code = await generateEmployeeCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const newEmployee = await EmployeeMaster.create({
      employeeCode: code,
      employeeName,
      mobile,
      email,
      joiningDate: joiningDate || null,
      status: status || 'Active',
      CompanyId: req.user.CompanyId,
      DepartmentId: DepartmentId || null,
      DesignationId: DesignationId || null,
      BranchId: BranchId || null,
      ReportingManagerId: ReportingManagerId || null,
      UserId: UserId || null,
      customFields: customFields || null
    });

    const createdEmployee = await EmployeeMaster.findByPk(newEmployee.id, {
      include: [
        { model: Department, attributes: ['id', 'name'] },
        { model: Designation, attributes: ['id', 'name'] },
        { model: Branch, attributes: ['id', 'name'] },
        { model: EmployeeMaster, as: 'ReportingManager', attributes: ['id', 'employeeName', 'employeeCode'] },
        { model: User, attributes: ['id', 'name', 'email'] }
      ]
    });

    res.status(201).json(createdEmployee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// PUT /api/master/employees/:id — update
router.put('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const employee = await EmployeeMaster.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const {
      employeeName, mobile, email, joiningDate, status,
      DepartmentId, DesignationId, BranchId, ReportingManagerId, UserId, employeeCode, customFields
    } = req.body;

    // Validate email uniqueness at user link if UserId is updated
    if (UserId && UserId !== employee.UserId) {
      const existingLink = await EmployeeMaster.findOne({ where: { UserId } });
      if (existingLink) {
        return res.status(400).json({ error: 'Selected User account is already linked to another employee.' });
      }
    }

    await employee.update({
      employeeCode: employeeCode !== undefined ? (employeeCode?.trim() || employee.employeeCode) : employee.employeeCode,
      employeeName,
      mobile,
      email,
      joiningDate: joiningDate || null,
      status,
      DepartmentId: DepartmentId || null,
      DesignationId: DesignationId || null,
      BranchId: BranchId || null,
      ReportingManagerId: ReportingManagerId || null,
      UserId: UserId !== undefined ? (UserId || null) : employee.UserId,
      customFields: customFields !== undefined ? customFields : employee.customFields
    });

    // Synchronize linked user profile if exists
    if (employee.UserId) {
      const linkedUser = await User.findOne({
        where: { id: employee.UserId, CompanyId: req.user.CompanyId }
      });
      if (linkedUser) {
        let reportingManagerUserId = null;
        if (employee.ReportingManagerId) {
          const repManager = await EmployeeMaster.findOne({
            where: { id: employee.ReportingManagerId, CompanyId: req.user.CompanyId }
          });
          reportingManagerUserId = repManager?.UserId || null;
        }

        await linkedUser.update({
          name: employee.employeeName,
          email: employee.email,
          employeeCode: employee.employeeCode,
          mobile: employee.mobile || null,
          joiningDate: employee.joiningDate || null,
          status: employee.status || 'Active',
          BranchId: employee.BranchId || null,
          DepartmentId: employee.DepartmentId || null,
          DesignationId: employee.DesignationId || null,
          ReportingManagerId: reportingManagerUserId
        });
      }
    }

    const updatedEmployee = await EmployeeMaster.findByPk(employee.id, {
      include: [
        { model: Department, attributes: ['id', 'name'] },
        { model: Designation, attributes: ['id', 'name'] },
        { model: Branch, attributes: ['id', 'name'] },
        { model: EmployeeMaster, as: 'ReportingManager', attributes: ['id', 'employeeName', 'employeeCode'] },
        { model: User, attributes: ['id', 'name', 'email'] }
      ]
    });

    res.json(updatedEmployee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// DELETE /api/master/employees/:id — delete (Admin only)
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const employee = await EmployeeMaster.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    await employee.destroy();
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

export default router;

import express from 'express';
import Department from '../models/department.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const departments = await Department.findAll({ where: { CompanyId: req.user.CompanyId } });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Helper: generate next department code for a company
const generateDepartmentCode = async (companyId) => {
  const count = await Department.count({ where: { CompanyId: companyId } });
  const nextNum = String(count + 1).padStart(4, '0');
  return `DEPT-${nextNum}`;
};

router.post('/', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { name, departmentCode, customFields } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Department Name is required' });
  }
  try {
    let code = departmentCode;
    if (!code || code.trim() === '') {
      code = await generateDepartmentCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }
    const newDept = await Department.create({
      departmentCode: code,
      name,
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });
    res.status(201).json(newDept);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

router.put('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { name, departmentCode, customFields } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Department Name is required' });
  }
  try {
    const dept = await Department.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!dept) return res.status(404).json({ error: 'Department not found' });
    await dept.update({
      departmentCode: departmentCode !== undefined ? (departmentCode?.trim() || dept.departmentCode) : dept.departmentCode,
      name,
      customFields: customFields !== undefined ? customFields : dept.customFields
    });
    res.json(dept);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const dept = await Department.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!dept) return res.status(404).json({ error: 'Department not found' });
    await dept.destroy();
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

export default router;

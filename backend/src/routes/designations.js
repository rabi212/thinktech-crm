import express from 'express';
import Designation from '../models/designation.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const designations = await Designation.findAll({ where: { CompanyId: req.user.CompanyId } });
    res.json(designations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch designations' });
  }
});

// Helper: generate next designation code for a company
const generateDesignationCode = async (companyId) => {
  const count = await Designation.count({ where: { CompanyId: companyId } });
  const nextNum = String(count + 1).padStart(4, '0');
  return `DESG-${nextNum}`;
};

router.post('/', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { name, designationCode, customFields } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Designation Name is required' });
  }
  try {
    let code = designationCode;
    if (!code || code.trim() === '') {
      code = await generateDesignationCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }
    const newDesig = await Designation.create({
      designationCode: code,
      name,
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });
    res.status(201).json(newDesig);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create designation' });
  }
});

router.put('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { name, designationCode, customFields } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Designation Name is required' });
  }
  try {
    const desig = await Designation.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!desig) return res.status(404).json({ error: 'Designation not found' });
    await desig.update({
      designationCode: designationCode !== undefined ? (designationCode?.trim() || desig.designationCode) : desig.designationCode,
      name,
      customFields: customFields !== undefined ? customFields : desig.customFields
    });
    res.json(desig);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update designation' });
  }
});

router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const desig = await Designation.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!desig) return res.status(404).json({ error: 'Designation not found' });
    await desig.destroy();
    res.json({ message: 'Designation deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete designation' });
  }
});

export default router;

import express from 'express';
import Unit from '../models/unit.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET all units
router.get('/', authenticateToken, async (req, res) => {
  try {
    const units = await Unit.findAll({ 
      where: { CompanyId: req.user.CompanyId },
      order: [['id', 'ASC']]
    });
    res.json(units);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch units' });
  }
});

// Helper: generate next unit code for a company
const generateUnitCode = async (companyId) => {
  const count = await Unit.count({ where: { CompanyId: companyId } });
  const nextNum = String(count + 1).padStart(4, '0');
  return `UNT-${nextNum}`;
};

// POST create unit
router.post('/', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { name, unitCode, status, customFields } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Unit Name is required' });
  }
  try {
    let code = unitCode;
    if (!code || code.trim() === '') {
      code = await generateUnitCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }
    const newUnit = await Unit.create({
      unitCode: code,
      name: name.trim(),
      status: status || 'Active',
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });
    res.status(201).json(newUnit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create unit' });
  }
});

// PUT update unit
router.put('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { name, unitCode, status, customFields } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Unit Name is required' });
  }
  try {
    const unit = await Unit.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    
    await unit.update({
      unitCode: unitCode !== undefined ? (unitCode?.trim() || unit.unitCode) : unit.unitCode,
      name: name.trim(),
      status: status !== undefined ? status : unit.status,
      customFields: customFields !== undefined ? customFields : unit.customFields
    });
    res.json(unit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update unit' });
  }
});

// DELETE unit
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const unit = await Unit.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    await unit.destroy();
    res.json({ message: 'Unit deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete unit' });
  }
});

export default router;

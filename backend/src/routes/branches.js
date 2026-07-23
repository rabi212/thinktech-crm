import express from 'express';
import { Op } from 'sequelize';
import Branch from '../models/branch.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper to generate branch code
const generateBranchCode = async (companyId) => {
  const count = await Branch.count({ 
    where: { 
      CompanyId: companyId,
      branchCode: { [Op.ne]: null }
    } 
  });
  const nextNum = String(count + 1).padStart(4, '0');
  return `BRN-${nextNum}`;
};

router.get('/', authenticateToken, async (req, res) => {
  try {
    const branches = await Branch.findAll({ 
      where: { CompanyId: req.user.CompanyId },
      order: [['id', 'ASC']]
    });
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

router.post('/', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { name, address, branchCode, status, customFields } = req.body;
  try {
    let code = branchCode;
    if (!code || code.trim() === '') {
      code = await generateBranchCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const newBranch = await Branch.create({ 
      name, 
      address: address || null, 
      branchCode: code,
      status: status || 'Active',
      customFields: customFields || null,
      CompanyId: req.user.CompanyId 
    });
    res.status(201).json(newBranch);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create branch' });
  }
});

router.put('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { name, address, branchCode, status, customFields } = req.body;
  try {
    const branch = await Branch.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    
    let code = branchCode;
    if (!code || code.trim() === '') {
      code = branch.branchCode;
      if (!code) {
        code = await generateBranchCode(req.user.CompanyId);
      }
    } else {
      code = code.trim();
    }

    await branch.update({ 
      name, 
      address: address || null,
      branchCode: code,
      status: status || branch.status,
      customFields: customFields !== undefined ? customFields : branch.customFields
    });
    res.json(branch);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update branch' });
  }
});

router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const branch = await Branch.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    await branch.destroy();
    res.json({ message: 'Branch deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete branch' });
  }
});

export default router;

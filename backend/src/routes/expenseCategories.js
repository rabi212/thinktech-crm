import express from 'express';
import ExpenseCategory from '../models/expenseCategory.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET all expense categories
router.get('/', authenticateToken, async (req, res) => {
  try {
    const categories = await ExpenseCategory.findAll({ 
      where: { CompanyId: req.user.CompanyId },
      order: [['id', 'ASC']]
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expense categories' });
  }
});

// Helper: generate next category code for a company
const generateCategoryCode = async (companyId) => {
  const count = await ExpenseCategory.count({ where: { CompanyId: companyId } });
  const nextNum = String(count + 1).padStart(4, '0');
  return `EXPC-${nextNum}`;
};

// POST create expense category
router.post('/', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { name, categoryCode, description, approvalRequired, status, customFields } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Category Name is required' });
  }
  try {
    let code = categoryCode;
    if (!code || code.trim() === '') {
      code = await generateCategoryCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }
    const newCat = await ExpenseCategory.create({
      categoryCode: code,
      name: name.trim(),
      description: description || null,
      approvalRequired: approvalRequired !== undefined ? approvalRequired : false,
      status: status || 'Active',
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });
    res.status(201).json(newCat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create expense category' });
  }
});

// PUT update expense category
router.put('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { name, categoryCode, description, approvalRequired, status, customFields } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Category Name is required' });
  }
  try {
    const cat = await ExpenseCategory.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!cat) return res.status(404).json({ error: 'Expense category not found' });
    
    await cat.update({
      categoryCode: categoryCode !== undefined ? (categoryCode?.trim() || cat.categoryCode) : cat.categoryCode,
      name: name.trim(),
      description: description !== undefined ? description : cat.description,
      approvalRequired: approvalRequired !== undefined ? approvalRequired : cat.approvalRequired,
      status: status !== undefined ? status : cat.status,
      customFields: customFields !== undefined ? customFields : cat.customFields
    });
    res.json(cat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update expense category' });
  }
});

// DELETE expense category
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const cat = await ExpenseCategory.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!cat) return res.status(404).json({ error: 'Expense category not found' });
    await cat.destroy();
    res.json({ message: 'Expense category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete expense category' });
  }
});

export default router;

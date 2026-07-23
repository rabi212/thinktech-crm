import express from 'express';
import ItemCategory from '../models/itemCategory.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const categories = await ItemCategory.findAll({ where: { CompanyId: req.user.CompanyId } });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch item categories' });
  }
});

// Helper: generate next category code for a company
const generateCategoryCode = async (companyId) => {
  const count = await ItemCategory.count({ where: { CompanyId: companyId } });
  const nextNum = String(count + 1).padStart(4, '0');
  return `CAT-${nextNum}`;
};

router.post('/', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { name, categoryCode, description, status, customFields } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Category Name is required' });
  }
  try {
    let code = categoryCode;
    if (!code || code.trim() === '') {
      code = await generateCategoryCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }
    const newCat = await ItemCategory.create({
      categoryCode: code,
      name,
      description: description || null,
      status: status || 'Active',
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });
    res.status(201).json(newCat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create item category' });
  }
});

router.put('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { name, categoryCode, description, status, customFields } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Category Name is required' });
  }
  try {
    const cat = await ItemCategory.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!cat) return res.status(404).json({ error: 'Item category not found' });
    await cat.update({
      categoryCode: categoryCode !== undefined ? (categoryCode?.trim() || cat.categoryCode) : cat.categoryCode,
      name,
      description: description !== undefined ? description : cat.description,
      status: status !== undefined ? status : cat.status,
      customFields: customFields !== undefined ? customFields : cat.customFields
    });
    res.json(cat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update item category' });
  }
});

router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const cat = await ItemCategory.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!cat) return res.status(404).json({ error: 'Item category not found' });
    await cat.destroy();
    res.json({ message: 'Item category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item category' });
  }
});

export default router;

import express from 'express';
import { Op } from 'sequelize';
import AmcCategory from '../models/amcCategory.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

const generateCategoryCode = async (companyId) => {
  const count = await AmcCategory.count({ where: { CompanyId: companyId } });
  const nextNum = String(count + 1).padStart(4, '0');
  return `AMC-${nextNum}`;
};

router.get('/', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management', 'AccountsUser', 'Employee']), async (req, res) => {
  try {
    const { search } = req.query;
    const whereClause = { CompanyId: req.user.CompanyId };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { categoryCode: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { defaultDuration: { [Op.like]: `%${search}%` } }
      ];
    }

    const categories = await AmcCategory.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch AMC categories' });
  }
});

router.post('/', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { name, categoryCode, description, defaultDuration, status, customFields } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'AMC Category Name is required' });
    }

    let code = categoryCode;
    if (!code || code.trim() === '') {
      code = await generateCategoryCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const category = await AmcCategory.create({
      categoryCode: code,
      name: name.trim(),
      description: description || null,
      defaultDuration: defaultDuration || null,
      status: status || 'Active',
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });

    res.status(201).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create AMC category' });
  }
});

router.put('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const category = await AmcCategory.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!category) return res.status(404).json({ error: 'AMC category not found' });

    const { name, categoryCode, description, defaultDuration, status, customFields } = req.body;

    if (name !== undefined && name.trim() === '') {
      return res.status(400).json({ error: 'AMC Category Name is required' });
    }

    await category.update({
      categoryCode: categoryCode !== undefined ? (categoryCode?.trim() || category.categoryCode) : category.categoryCode,
      name: name !== undefined ? name.trim() : category.name,
      description: description !== undefined ? description : category.description,
      defaultDuration: defaultDuration !== undefined ? defaultDuration : category.defaultDuration,
      status: status !== undefined ? status : category.status,
      customFields: customFields !== undefined ? customFields : category.customFields
    });

    res.json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update AMC category' });
  }
});

router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const category = await AmcCategory.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!category) return res.status(404).json({ error: 'AMC category not found' });

    await category.destroy();
    res.json({ message: 'AMC category deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete AMC category' });
  }
});

export default router;

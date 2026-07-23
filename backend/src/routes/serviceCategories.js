import express from 'express';
import { Op } from 'sequelize';
import ServiceCategory from '../models/serviceCategory.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper: generate next category code for a company
const generateCategoryCode = async (companyId) => {
  const count = await ServiceCategory.count({ where: { CompanyId: companyId } });
  const nextNum = String(count + 1).padStart(4, '0');
  return `SVCC-${nextNum}`;
};

// GET /api/service-categories — list all with optional search
router.get('/', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management', 'AccountsUser', 'Employee']), async (req, res) => {
  try {
    const { search } = req.query;
    const whereClause = { CompanyId: req.user.CompanyId };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { categoryCode: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const categories = await ServiceCategory.findAll({
      where: whereClause,
      include: [
        { model: ServiceCategory, as: 'Parent', attributes: ['id', 'name', 'categoryCode'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch service categories' });
  }
});

// GET /api/service-categories/:id — single service category
router.get('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management', 'AccountsUser', 'Employee']), async (req, res) => {
  try {
    const category = await ServiceCategory.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [
        { model: ServiceCategory, as: 'Parent', attributes: ['id', 'name', 'categoryCode'] }
      ]
    });
    if (!category) return res.status(404).json({ error: 'Service category not found' });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch service category' });
  }
});

// POST /api/service-categories — create service category
router.post('/', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { name, categoryCode, description, ParentId, status, customFields } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Category Name is required' });
    }

    let parentCategory = null;
    if (ParentId) {
      parentCategory = await ServiceCategory.findOne({
        where: { id: ParentId, CompanyId: req.user.CompanyId }
      });
      if (!parentCategory) {
        return res.status(400).json({ error: 'Invalid Parent Category selected' });
      }
    }

    let code = categoryCode;
    if (!code || code.trim() === '') {
      code = await generateCategoryCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const newCat = await ServiceCategory.create({
      categoryCode: code,
      name: name.trim(),
      description: description || null,
      ParentId: ParentId || null,
      status: status || 'Active',
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });

    const populated = await ServiceCategory.findOne({
      where: { id: newCat.id },
      include: [
        { model: ServiceCategory, as: 'Parent', attributes: ['id', 'name', 'categoryCode'] }
      ]
    });

    res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create service category' });
  }
});

// PUT /api/service-categories/:id — update service category
router.put('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const category = await ServiceCategory.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!category) return res.status(404).json({ error: 'Service category not found' });

    const { name, categoryCode, description, ParentId, status, customFields } = req.body;

    if (name !== undefined && name.trim() === '') {
      return res.status(400).json({ error: 'Category Name is required' });
    }

    if (ParentId) {
      if (Number(ParentId) === Number(req.params.id)) {
        return res.status(400).json({ error: 'A service category cannot be its own parent category' });
      }
      const parentCategory = await ServiceCategory.findOne({
        where: { id: ParentId, CompanyId: req.user.CompanyId }
      });
      if (!parentCategory) {
        return res.status(400).json({ error: 'Invalid Parent Category selected' });
      }
    }

    await category.update({
      categoryCode: categoryCode !== undefined ? (categoryCode?.trim() || category.categoryCode) : category.categoryCode,
      name: name !== undefined ? name.trim() : category.name,
      description: description !== undefined ? description : category.description,
      ParentId: ParentId !== undefined ? (ParentId || null) : category.ParentId,
      status: status !== undefined ? status : category.status,
      customFields: customFields !== undefined ? customFields : category.customFields
    });

    const populated = await ServiceCategory.findOne({
      where: { id: category.id },
      include: [
        { model: ServiceCategory, as: 'Parent', attributes: ['id', 'name', 'categoryCode'] }
      ]
    });

    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update service category' });
  }
});

// DELETE /api/service-categories/:id — delete service category (Admin only)
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const transaction = await ServiceCategory.sequelize.transaction();
  try {
    const category = await ServiceCategory.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      transaction
    });
    if (!category) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Service category not found' });
    }

    // Step 1: Delete all subcategories of this parent (cascade delete)
    await ServiceCategory.destroy({
      where: { ParentId: category.id, CompanyId: req.user.CompanyId },
      transaction
    });

    // Step 2: Delete the parent category itself
    await category.destroy({ transaction });

    await transaction.commit();
    res.json({ message: 'Service category and its subcategories deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to delete service category' });
  }
});

export default router;

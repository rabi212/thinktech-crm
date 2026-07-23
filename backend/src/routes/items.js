import express from 'express';
import Item from '../models/item.js';
import ItemCategory from '../models/itemCategory.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET all items for a company (includes category relation)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const items = await Item.findAll({
      where: { CompanyId: req.user.CompanyId },
      include: [
        {
          model: ItemCategory,
          as: 'Category',
          attributes: ['id', 'name', 'categoryCode']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Helper: generate next item code for a company
const generateItemCode = async (companyId) => {
  const count = await Item.count({ where: { CompanyId: companyId } });
  const nextNum = String(count + 1).padStart(4, '0');
  return `ITEM-${nextNum}`;
};

// POST create a new item
router.post('/', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const {
    name, itemCode, ItemCategoryId, unit, purchasePrice,
    sellingPrice, gstPercent, discountPercent, hsnSacCode, description, status, customFields,
    trackingType, hasExpiry, reorderLevel
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Item Name is required' });
  }

  try {
    let code = itemCode;
    if (!code || code.trim() === '') {
      code = await generateItemCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const newItem = await Item.create({
      itemCode: code,
      name,
      ItemCategoryId: ItemCategoryId || null,
      unit: unit || null,
      purchasePrice: purchasePrice !== undefined ? purchasePrice : 0.00,
      sellingPrice: sellingPrice !== undefined ? sellingPrice : 0.00,
      gstPercent: gstPercent !== undefined ? gstPercent : 18.00,
      discountPercent: discountPercent !== undefined ? discountPercent : 0.00,
      hsnSacCode: hsnSacCode || null,
      description: description || null,
      status: status || 'Active',
      customFields: customFields || null,
      trackingType: trackingType || 'None',
      hasExpiry: hasExpiry !== undefined ? hasExpiry : false,
      reorderLevel: reorderLevel !== undefined ? reorderLevel : 0.00,
      CompanyId: req.user.CompanyId
    });

    // Fetch the newly created item with its category relation included
    const result = await Item.findOne({
      where: { id: newItem.id },
      include: [{ model: ItemCategory, as: 'Category', attributes: ['id', 'name', 'categoryCode'] }]
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// PUT update an item
router.put('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const {
    name, itemCode, ItemCategoryId, unit, purchasePrice,
    sellingPrice, gstPercent, discountPercent, hsnSacCode, description, status, customFields,
    trackingType, hasExpiry, reorderLevel
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Item Name is required' });
  }

  try {
    const item = await Item.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await item.update({
      itemCode: itemCode !== undefined ? (itemCode?.trim() || item.itemCode) : item.itemCode,
      name,
      ItemCategoryId: ItemCategoryId !== undefined ? ItemCategoryId : item.ItemCategoryId,
      unit: unit !== undefined ? unit : item.unit,
      purchasePrice: purchasePrice !== undefined ? purchasePrice : item.purchasePrice,
      sellingPrice: sellingPrice !== undefined ? sellingPrice : item.sellingPrice,
      gstPercent: gstPercent !== undefined ? gstPercent : item.gstPercent,
      discountPercent: discountPercent !== undefined ? discountPercent : item.discountPercent,
      hsnSacCode: hsnSacCode !== undefined ? hsnSacCode : item.hsnSacCode,
      description: description !== undefined ? description : item.description,
      status: status !== undefined ? status : item.status,
      trackingType: trackingType !== undefined ? trackingType : item.trackingType,
      hasExpiry: hasExpiry !== undefined ? hasExpiry : item.hasExpiry,
      reorderLevel: reorderLevel !== undefined ? reorderLevel : item.reorderLevel,
      customFields: customFields !== undefined ? customFields : item.customFields
    });

    const result = await Item.findOne({
      where: { id: item.id },
      include: [{ model: ItemCategory, as: 'Category', attributes: ['id', 'name', 'categoryCode'] }]
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE an item
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const item = await Item.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    await item.destroy();
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

export default router;

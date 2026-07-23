import express from 'express';
import { Op } from 'sequelize';
import GoodsReceiptNote from '../models/goodsReceiptNote.js';
import PurchaseOrder from '../models/purchaseOrder.js';
import Warehouse from '../models/warehouse.js';
import Vendor from '../models/vendor.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generateGRNCode } from '../models/goodsReceiptNote.js';

const router = express.Router();

// GET /api/vendor/grn - list all with optional search
router.get('/', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const { search, status, vendorId, poId, warehouseId, dateFrom, dateTo } = req.query;
    const whereClause = { CompanyId: req.user.CompanyId };

    if (search) {
      whereClause[Op.or] = [
        { grnNumber: { [Op.like]: `%${search}%` } },
        { challanNumber: { [Op.like]: `%${search}%` } },
        { '$Vendor.vendorName$': { [Op.like]: `%${search}%` } },
        { '$PurchaseOrder.poNumber$': { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) whereClause.status = status;
    if (vendorId) whereClause.VendorId = vendorId;
    if (poId) whereClause.PurchaseOrderId = poId;
    if (warehouseId) whereClause.WarehouseId = warehouseId;
    if (dateFrom || dateTo) {
      whereClause.grnDate = {};
      if (dateFrom) whereClause.grnDate[Op.gte] = dateFrom;
      if (dateTo) whereClause.grnDate[Op.lte] = dateTo;
    }

    const grns = await GoodsReceiptNote.findAll({
      where: whereClause,
      include: [
        { model: PurchaseOrder, as: 'PurchaseOrder', attributes: ['id', 'poNumber'] },
        { model: Warehouse, as: 'Warehouse', attributes: ['id', 'name'] },
        { model: Vendor, as: 'Vendor', attributes: ['id', 'vendorCode', 'vendorName'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(grns);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch goods receipt notes' });
  }
});

// GET /api/vendor/grn/:id - single GRN
router.get('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const grn = await GoodsReceiptNote.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [
        { model: PurchaseOrder, as: 'PurchaseOrder' },
        { model: Warehouse, as: 'Warehouse' },
        { model: Vendor, as: 'Vendor' }
      ]
    });
    if (!grn) return res.status(404).json({ error: 'Goods receipt note not found' });
    res.json(grn);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch goods receipt note' });
  }
});

// POST /api/vendor/grn - create
router.post('/', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const {
      grnNumber, grnDate, PurchaseOrderId, WarehouseId, VendorId,
      challanNumber, challanDate, transporter, vehicleNo, receivedDate,
      status, items, remarks, customFields
    } = req.body;

    if (!PurchaseOrderId || !WarehouseId || !VendorId) {
      return res.status(400).json({ error: 'Purchase Order, Warehouse, and Vendor are required.' });
    }

    let code = grnNumber;
    if (!code || code.trim() === '') {
      code = await generateGRNCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const newGRN = await GoodsReceiptNote.create({
      grnNumber: code,
      grnDate: grnDate || new Date(),
      PurchaseOrderId,
      WarehouseId,
      VendorId,
      challanNumber: challanNumber?.trim(),
      challanDate: challanDate || null,
      transporter: transporter?.trim(),
      vehicleNo: vehicleNo?.trim(),
      receivedDate: receivedDate || null,
      status: status || 'Scheduled',
      items: items || [],
      remarks: remarks?.trim(),
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });

    res.status(201).json(newGRN);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create goods receipt note' });
  }
});

// PUT /api/vendor/grn/:id - update
router.put('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const grn = await GoodsReceiptNote.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!grn) return res.status(404).json({ error: 'Goods receipt note not found' });

    const {
      grnDate, PurchaseOrderId, WarehouseId, VendorId,
      challanNumber, challanDate, transporter, vehicleNo, receivedDate,
      status, items, remarks, customFields
    } = req.body;

    await grn.update({
      grnDate: grnDate || grn.grnDate,
      PurchaseOrderId: PurchaseOrderId || grn.PurchaseOrderId,
      WarehouseId: WarehouseId || grn.WarehouseId,
      VendorId: VendorId || grn.VendorId,
      challanNumber: challanNumber?.trim(),
      challanDate: challanDate || grn.challanDate,
      transporter: transporter?.trim(),
      vehicleNo: vehicleNo?.trim(),
      receivedDate: receivedDate || grn.receivedDate,
      status: status || grn.status,
      items: items || grn.items,
      remarks: remarks?.trim(),
      customFields: customFields !== undefined ? customFields : grn.customFields
    });

    res.json(grn);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update goods receipt note' });
  }
});

// DELETE /api/vendor/grn/:id - delete (Admin only)
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const grn = await GoodsReceiptNote.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!grn) return res.status(404).json({ error: 'Goods receipt note not found' });
    await grn.destroy();
    res.json({ message: 'Goods receipt note deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete goods receipt note' });
  }
});

export default router;
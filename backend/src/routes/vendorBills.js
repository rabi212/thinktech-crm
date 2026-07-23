import express from 'express';
import { Op } from 'sequelize';
import VendorBill from '../models/vendorBill.js';
import Vendor from '../models/vendor.js';
import PurchaseOrder from '../models/purchaseOrder.js';
import GoodsReceiptNote from '../models/goodsReceiptNote.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generateBillCode } from '../models/vendorBill.js';

const router = express.Router();

// GET /api/vendor/bills - list all with optional search
router.get('/', authenticateToken, requireRole(['Admin', 'AccountsUser', 'Management']), async (req, res) => {
  try {
    const { search, status, paymentStatus, vendorId, poId, grnId, dateFrom, dateTo } = req.query;
    const whereClause = { CompanyId: req.user.CompanyId };

    if (search) {
      whereClause[Op.or] = [
        { billNumber: { [Op.like]: `%${search}%` } },
        { '$Vendor.vendorName$': { [Op.like]: `%${search}%` } },
        { '$Vendor.vendorCode$': { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) whereClause.status = status;
    if (paymentStatus) whereClause.paymentStatus = paymentStatus;
    if (vendorId) whereClause.VendorId = vendorId;
    if (poId) whereClause.PurchaseOrderId = poId;
    if (grnId) whereClause.GRNId = grnId;
    if (dateFrom || dateTo) {
      whereClause.billDate = {};
      if (dateFrom) whereClause.billDate[Op.gte] = dateFrom;
      if (dateTo) whereClause.billDate[Op.lte] = dateTo;
    }

    const bills = await VendorBill.findAll({
      where: whereClause,
      include: [
        { model: Vendor, as: 'Vendor', attributes: ['id', 'vendorCode', 'vendorName'] },
        { model: PurchaseOrder, as: 'PurchaseOrder', attributes: ['id', 'poNumber'] },
        { model: GoodsReceiptNote, as: 'GRN', attributes: ['id', 'grnNumber'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(bills);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch vendor bills' });
  }
});

// GET /api/vendor/bills/:id - single bill
router.get('/:id', authenticateToken, requireRole(['Admin', 'AccountsUser', 'Management']), async (req, res) => {
  try {
    const bill = await VendorBill.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [
        { model: Vendor, as: 'Vendor' },
        { model: PurchaseOrder, as: 'PurchaseOrder' },
        { model: GoodsReceiptNote, as: 'GRN' }
      ]
    });
    if (!bill) return res.status(404).json({ error: 'Vendor bill not found' });
    res.json(bill);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch vendor bill' });
  }
});

// POST /api/vendor/bills - create
router.post('/', authenticateToken, requireRole(['Admin', 'AccountsUser']), async (req, res) => {
  try {
    const {
      billNumber, billDate, VendorId, PurchaseOrderId, GRNId, dueDate,
      billAmount, taxAmount, totalAmount, status, paymentStatus, remarks, customFields
    } = req.body;

    if (!VendorId) {
      return res.status(400).json({ error: 'Vendor is required.' });
    }

    let code = billNumber;
    if (!code || code.trim() === '') {
      code = await generateBillCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const newBill = await VendorBill.create({
      billNumber: code,
      billDate: billDate || new Date(),
      VendorId,
      PurchaseOrderId: PurchaseOrderId || null,
      GRNId: GRNId || null,
      dueDate: dueDate || null,
      billAmount: billAmount || 0,
      taxAmount: taxAmount || 0,
      totalAmount: (parseFloat(billAmount || 0) + parseFloat(taxAmount || 0)).toFixed(2),
      status: status || 'Pending',
      paymentStatus: paymentStatus || 'Unpaid',
      remarks: remarks?.trim(),
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });

    res.status(201).json(newBill);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create vendor bill' });
  }
});

// PUT /api/vendor/bills/:id - update
router.put('/:id', authenticateToken, requireRole(['Admin', 'AccountsUser']), async (req, res) => {
  try {
    const bill = await VendorBill.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!bill) return res.status(404).json({ error: 'Vendor bill not found' });

    const {
      billDate, VendorId, PurchaseOrderId, GRNId, dueDate,
      billAmount, taxAmount, totalAmount, status, paymentStatus, remarks, customFields
    } = req.body;

    await bill.update({
      billDate: billDate || bill.billDate,
      VendorId: VendorId || bill.VendorId,
      PurchaseOrderId: PurchaseOrderId !== undefined ? (PurchaseOrderId || null) : bill.PurchaseOrderId,
      GRNId: GRNId !== undefined ? (GRNId || null) : bill.GRNId,
      dueDate: dueDate || bill.dueDate,
      billAmount: billAmount !== undefined ? billAmount : bill.billAmount,
      taxAmount: taxAmount !== undefined ? taxAmount : bill.taxAmount,
      totalAmount: totalAmount !== undefined ? totalAmount : (parseFloat(billAmount || bill.billAmount) + parseFloat(taxAmount || bill.taxAmount)).toFixed(2),
      status: status || bill.status,
      paymentStatus: paymentStatus || bill.paymentStatus,
      remarks: remarks?.trim(),
      customFields: customFields !== undefined ? customFields : bill.customFields
    });

    res.json(bill);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update vendor bill' });
  }
});

// DELETE /api/vendor/bills/:id - delete (Admin only)
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const bill = await VendorBill.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!bill) return res.status(404).json({ error: 'Vendor bill not found' });
    await bill.destroy();
    res.json({ message: 'Vendor bill deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete vendor bill' });
  }
});

export default router;
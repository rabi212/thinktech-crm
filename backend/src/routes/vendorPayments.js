import express from 'express';
import { Op } from 'sequelize';
import VendorPayment from '../models/vendorPayment.js';
import Vendor from '../models/vendor.js';
import VendorBill from '../models/vendorBill.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generatePaymentCode } from '../models/vendorPayment.js';

const router = express.Router();

// GET /api/vendor/payments - list all with optional search
router.get('/', authenticateToken, requireRole(['Admin', 'AccountsUser', 'Management']), async (req, res) => {
  try {
    const { search, status, mode, vendorId, billId, dateFrom, dateTo } = req.query;
    const whereClause = { CompanyId: req.user.CompanyId };

    if (search) {
      whereClause[Op.or] = [
        { paymentNumber: { [Op.like]: `%${search}%` } },
        { referenceNumber: { [Op.like]: `%${search}%` } },
        { '$Vendor.vendorName$': { [Op.like]: `%${search}%` } },
        { '$Vendor.vendorCode$': { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) whereClause.status = status;
    if (mode) whereClause.mode = mode;
    if (vendorId) whereClause.VendorId = vendorId;
    if (billId) whereClause.VendorBillId = billId;
    if (dateFrom || dateTo) {
      whereClause.paymentDate = {};
      if (dateFrom) whereClause.paymentDate[Op.gte] = dateFrom;
      if (dateTo) whereClause.paymentDate[Op.lte] = dateTo;
    }

    const payments = await VendorPayment.findAll({
      where: whereClause,
      include: [
        { model: Vendor, as: 'Vendor', attributes: ['id', 'vendorCode', 'vendorName'] },
        { model: VendorBill, as: 'VendorBill', attributes: ['id', 'billNumber'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(payments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch vendor payments' });
  }
});

// GET /api/vendor/payments/:id - single payment
router.get('/:id', authenticateToken, requireRole(['Admin', 'AccountsUser', 'Management']), async (req, res) => {
  try {
    const payment = await VendorPayment.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [
        { model: Vendor, as: 'Vendor' },
        { model: VendorBill, as: 'VendorBill' }
      ]
    });
    if (!payment) return res.status(404).json({ error: 'Vendor payment not found' });
    res.json(payment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch vendor payment' });
  }
});

// POST /api/vendor/payments - create
router.post('/', authenticateToken, requireRole(['Admin', 'AccountsUser']), async (req, res) => {
  try {
    const {
      paymentNumber, paymentDate, VendorId, VendorBillId, amount, mode,
      referenceNumber, bankName, chequeDate, clearingDate, status, remarks, customFields
    } = req.body;

    if (!VendorId) {
      return res.status(400).json({ error: 'Vendor is required.' });
    }

    let code = paymentNumber;
    if (!code || code.trim() === '') {
      code = await generatePaymentCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const newPayment = await VendorPayment.create({
      paymentNumber: code,
      paymentDate: paymentDate || new Date(),
      VendorId,
      VendorBillId: VendorBillId || null,
      amount: amount || 0,
      mode: mode || 'Bank Transfer',
      referenceNumber: referenceNumber?.trim(),
      bankName: bankName?.trim(),
      chequeDate: chequeDate || null,
      clearingDate: clearingDate || null,
      status: status || 'Pending',
      remarks: remarks?.trim(),
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });

    // If payment is linked to a bill and status is not pending, update bill's payment status
    if (VendorBillId && status && (status === 'Completed' || status === 'Cleared')) {
      try {
        const bill = await VendorBill.findByPk(VendorBillId);
        if (bill) {
          const totalPaid = (await VendorPayment.sum('amount', {
            where: { VendorBillId, CompanyId: req.user.CompanyId, status: ['Completed', 'Cleared'] }
          })) || 0;
          if (totalPaid >= parseFloat(bill.totalAmount || 0)) {
            await bill.update({ paymentStatus: 'Paid' });
          } else if (totalPaid > 0) {
            await bill.update({ paymentStatus: 'Partially Paid' });
          }
        }
      } catch (err) {
        console.error('Failed to update bill payment status:', err);
      }
    }

    res.status(201).json(newPayment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create vendor payment' });
  }
});

// PUT /api/vendor/payments/:id - update
router.put('/:id', authenticateToken, requireRole(['Admin', 'AccountsUser']), async (req, res) => {
  try {
    const payment = await VendorPayment.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!payment) return res.status(404).json({ error: 'Vendor payment not found' });

    const {
      paymentDate, VendorId, VendorBillId, amount, mode,
      referenceNumber, bankName, chequeDate, clearingDate, status, remarks, customFields
    } = req.body;

    await payment.update({
      paymentDate: paymentDate || payment.paymentDate,
      VendorId: VendorId || payment.VendorId,
      VendorBillId: VendorBillId !== undefined ? (VendorBillId || null) : payment.VendorBillId,
      amount: amount !== undefined ? amount : payment.amount,
      mode: mode || payment.mode,
      referenceNumber: referenceNumber?.trim(),
      bankName: bankName?.trim(),
      chequeDate: chequeDate || payment.chequeDate,
      clearingDate: clearingDate || payment.clearingDate,
      status: status || payment.status,
      remarks: remarks?.trim(),
      customFields: customFields !== undefined ? customFields : payment.customFields
    });

    res.json(payment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update vendor payment' });
  }
});

// DELETE /api/vendor/payments/:id - delete (Admin only)
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const payment = await VendorPayment.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!payment) return res.status(404).json({ error: 'Vendor payment not found' });
    await payment.destroy();
    res.json({ message: 'Vendor payment deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete vendor payment' });
  }
});

export default router;
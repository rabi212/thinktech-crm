import express from 'express';
import { Op } from 'sequelize';
import VendorQuotation from '../models/vendorQuotation.js';
import Vendor from '../models/vendor.js';
import VendorEnquiry from '../models/vendorEnquiry.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generateQuotationCode } from '../models/vendorQuotation.js';
import { sendEmail } from '../utils/emailService.js';

const router = express.Router();

// GET /api/vendor/quotations - list all with optional search/filter
router.get('/', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const { search, status, vendorId, enquiryId, dateFrom, dateTo } = req.query;
    const whereClause = { CompanyId: req.user.CompanyId };

    if (search) {
      whereClause[Op.or] = [
        { quotationNumber: { [Op.like]: `%${search}%` } },
        { '$Vendor.vendorName$': { [Op.like]: `%${search}%` } },
        { '$Vendor.vendorCode$': { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) whereClause.status = status;
    if (vendorId) whereClause.VendorId = vendorId;
    if (enquiryId) whereClause.VendorEnquiryId = enquiryId;
    if (dateFrom || dateTo) {
      whereClause.quotationDate = {};
      if (dateFrom) whereClause.quotationDate[Op.gte] = dateFrom;
      if (dateTo) whereClause.quotationDate[Op.lte] = dateTo;
    }

    const quotations = await VendorQuotation.findAll({
      where: whereClause,
      include: [
        { model: Vendor, as: 'Vendor', attributes: ['id', 'vendorCode', 'vendorName'] },
        { model: VendorEnquiry, as: 'VendorEnquiry', attributes: ['id', 'enquiryNumber'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(quotations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch vendor quotations' });
  }
});

// GET /api/vendor/quotations/:id - single quotation
router.get('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const quotation = await VendorQuotation.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [
        { model: Vendor, as: 'Vendor' },
        { model: VendorEnquiry, as: 'VendorEnquiry' },
        { model: VendorQuotation, as: 'Revisions', include: [{ model: Vendor, as: 'Vendor', attributes: ['vendorName'] }] },
        { model: VendorQuotation, as: 'ParentQuotation' }
      ]
    });
    if (!quotation) return res.status(404).json({ error: 'Vendor quotation not found' });
    res.json(quotation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch vendor quotation' });
  }
});

// POST /api/vendor/quotations - create
router.post('/', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const {
      quotationNumber, quotationDate, VendorId, VendorEnquiryId, validityDate,
      status, termsConditions, remarks, items, totalAmount, customFields
    } = req.body;

    if (!VendorId) {
      return res.status(400).json({ error: 'Vendor is required.' });
    }

    let code = quotationNumber;
    if (!code || code.trim() === '' || code.trim() === 'Auto Generated') {
      code = await generateQuotationCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const newQuotation = await VendorQuotation.create({
      quotationNumber: code,
      quotationDate: quotationDate || new Date(),
      VendorId,
      VendorEnquiryId: VendorEnquiryId || null,
      validityDate: validityDate || null,
      status: status || 'Draft',
      termsConditions: termsConditions || null,
      remarks: remarks?.trim(),
      items: items || [],
      totalAmount: totalAmount || 0,
      revisionNumber: 0,
      parentQuotationId: null,
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });

    res.status(201).json(newQuotation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create vendor quotation' });
  }
});

// POST /api/vendor/quotations/:id/revision - create revision
router.post('/:id/revision', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const originalQuotation = await VendorQuotation.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!originalQuotation) {
      return res.status(404).json({ error: 'Original quotation not found.' });
    }

    const baseParentId = originalQuotation.parentQuotationId || originalQuotation.id;
    const code = await generateQuotationCode(req.user.CompanyId, baseParentId);

    const revCount = await VendorQuotation.count({
      where: { parentQuotationId: baseParentId, CompanyId: req.user.CompanyId }
    });

    const { quotationDate, totalAmount, validityDate, termsConditions, remarks, items, status } = req.body;

    const newRevision = await VendorQuotation.create({
      quotationNumber: code,
      quotationDate: quotationDate || new Date(),
      VendorId: originalQuotation.VendorId,
      VendorEnquiryId: originalQuotation.VendorEnquiryId,
      validityDate: validityDate || originalQuotation.validityDate,
      status: status || 'Draft',
      termsConditions: termsConditions || originalQuotation.termsConditions,
      remarks: remarks || originalQuotation.remarks,
      items: items || originalQuotation.items,
      totalAmount: totalAmount !== undefined ? totalAmount : originalQuotation.totalAmount,
      revisionNumber: revCount + 1,
      parentQuotationId: baseParentId,
      customFields: originalQuotation.customFields,
      CompanyId: req.user.CompanyId
    });

    res.status(201).json(newRevision);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create vendor quotation revision' });
  }
});

// PUT /api/vendor/quotations/:id - update
router.put('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const quotation = await VendorQuotation.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!quotation) return res.status(404).json({ error: 'Vendor quotation not found' });

    const {
      quotationDate, VendorId, VendorEnquiryId, validityDate, status,
      termsConditions, remarks, items, totalAmount, customFields
    } = req.body;

    await quotation.update({
      quotationDate: quotationDate || quotation.quotationDate,
      VendorId: VendorId || quotation.VendorId,
      VendorEnquiryId: VendorEnquiryId !== undefined ? (VendorEnquiryId || null) : quotation.VendorEnquiryId,
      validityDate: validityDate || quotation.validityDate,
      status: status || quotation.status,
      termsConditions: termsConditions !== undefined ? termsConditions : quotation.termsConditions,
      remarks: remarks !== undefined ? remarks : quotation.remarks,
      items: items !== undefined ? items : quotation.items,
      totalAmount: totalAmount !== undefined ? totalAmount : quotation.totalAmount,
      customFields: customFields !== undefined ? customFields : quotation.customFields
    });

    res.json(quotation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update vendor quotation' });
  }
});

// DELETE /api/vendor/quotations/:id - delete (Admin only)
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const quotation = await VendorQuotation.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!quotation) return res.status(404).json({ error: 'Vendor quotation not found' });
    await quotation.destroy();
    res.json({ message: 'Vendor quotation deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete vendor quotation' });
  }
});

// POST /api/vendor/quotations/:id/email - send quotation via email
router.post('/:id/email', authenticateToken, async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    if (!to || !subject || !message) {
      return res.status(400).json({ error: 'Email, subject, and message are required' });
    }

    const quotation = await VendorQuotation.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [{ model: Vendor, as: 'Vendor' }]
    });
    if (!quotation) return res.status(404).json({ error: 'Vendor quotation not found' });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <div style="white-space: pre-wrap; line-height: 1.6; margin-bottom: 20px;">
          ${message}
        </div>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">
          <strong>Quotation Details:</strong><br/>
          Quotation #: ${quotation.quotationNumber}<br/>
          Date: ${new Date(quotation.quotationDate).toLocaleDateString('en-IN')}<br/>
          Amount: ₹${parseFloat(quotation.totalAmount).toLocaleString('en-IN')}
        </p>
      </div>
    `;

    await sendEmail(to, subject, htmlContent);
    res.json({ message: 'Vendor quotation emailed successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email: ' + error.message });
  }
});

export default router;

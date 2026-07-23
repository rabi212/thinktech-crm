import express from 'express';
import { Op } from 'sequelize';
import VendorEnquiry from '../models/vendorEnquiry.js';
import Vendor from '../models/vendor.js';
import User from '../models/user.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generateEnquiryCode } from '../models/vendorEnquiry.js';
import VendorEnquiryActivity from '../models/vendorEnquiryActivity.js';
import VendorEnquiryAttachment from '../models/vendorEnquiryAttachment.js';
import VendorQuotation, { generateQuotationCode } from '../models/vendorQuotation.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// GET /api/vendor/enquiries - list all with optional search
router.get('/', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const { search, status, vendorId, assignedToId, dateFrom, dateTo } = req.query;
    const whereClause = { CompanyId: req.user.CompanyId };

    if (search) {
      whereClause[Op.or] = [
        { enquiryNumber: { [Op.like]: `%${search}%` } },
        { productService: { [Op.like]: `%${search}%` } },
        { contactPerson: { [Op.like]: `%${search}%` } },
        { '$Vendor.vendorName$': { [Op.like]: `%${search}%` } },
        { '$Vendor.vendorCode$': { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) whereClause.status = status;
    if (vendorId) whereClause.VendorId = vendorId;
    if (assignedToId) whereClause.AssignedToId = assignedToId;
    if (dateFrom || dateTo) {
      whereClause.enquiryDate = {};
      if (dateFrom) whereClause.enquiryDate[Op.gte] = dateFrom;
      if (dateTo) whereClause.enquiryDate[Op.lte] = dateTo;
    }

    const enquiries = await VendorEnquiry.findAll({
      where: whereClause,
      include: [
        { model: Vendor, as: 'Vendor', attributes: ['id', 'vendorCode', 'vendorName'] },
        { model: User, as: 'AssignedTo', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(enquiries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch vendor enquiries' });
  }
});

// GET /api/vendor/enquiries/:id - single enquiry
router.get('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const enquiry = await VendorEnquiry.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [
        { model: Vendor, as: 'Vendor' },
        { model: User, as: 'AssignedTo', attributes: ['id', 'name'] },
        { model: VendorEnquiryAttachment }
      ]
    });
    if (!enquiry) return res.status(404).json({ error: 'Vendor enquiry not found' });
    res.json(enquiry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch vendor enquiry' });
  }
});

// POST /api/vendor/enquiries - create
router.post('/', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const {
      enquiryNumber, enquiryDate, VendorId, contactPerson, mobileNumber, email,
      productService, quantity, expectedClosingDate, AssignedToId, priority, status,
      estimatedValue, details, items, totalAmount, remarks, customFields
    } = req.body;

    if (!VendorId) {
      return res.status(400).json({ error: 'Vendor is required.' });
    }

    let code = enquiryNumber;
    if (!code || code.trim() === '') {
      code = await generateEnquiryCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const newEnquiry = await VendorEnquiry.create({
      enquiryNumber: code,
      enquiryDate: enquiryDate || new Date(),
      VendorId,
      contactPerson: contactPerson?.trim(),
      mobileNumber: mobileNumber?.trim(),
      email: email?.trim(),
      productService: productService?.trim(),
      quantity: quantity || null,
      expectedClosingDate: expectedClosingDate || null,
      AssignedToId: AssignedToId || null,
      priority: priority || 'Medium',
      status: status || 'New',
      estimatedValue: estimatedValue || 0,
      details: details?.trim(),
      items: items || [],
      totalAmount: totalAmount || 0,
      remarks: remarks?.trim(),
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });

    res.status(201).json(newEnquiry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create vendor enquiry' });
  }
});

// PUT /api/vendor/enquiries/:id - update
router.put('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const enquiry = await VendorEnquiry.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!enquiry) return res.status(404).json({ error: 'Vendor enquiry not found' });

    const {
      enquiryDate, VendorId, contactPerson, mobileNumber, email,
      productService, quantity, expectedClosingDate, AssignedToId, priority, status,
      estimatedValue, details, items, totalAmount, remarks, customFields
    } = req.body;

    await enquiry.update({
      enquiryDate: enquiryDate || enquiry.enquiryDate,
      VendorId: VendorId || enquiry.VendorId,
      contactPerson: contactPerson?.trim(),
      mobileNumber: mobileNumber?.trim(),
      email: email?.trim(),
      productService: productService?.trim(),
      quantity: quantity !== undefined ? quantity : enquiry.quantity,
      expectedClosingDate: expectedClosingDate || enquiry.expectedClosingDate,
      AssignedToId: AssignedToId !== undefined ? (AssignedToId || null) : enquiry.AssignedToId,
      priority: priority || enquiry.priority,
      status: status || enquiry.status,
      estimatedValue: estimatedValue !== undefined ? estimatedValue : enquiry.estimatedValue,
      details: details?.trim(),
      items: items || enquiry.items,
      totalAmount: totalAmount !== undefined ? totalAmount : enquiry.totalAmount,
      remarks: remarks?.trim(),
      customFields: customFields !== undefined ? customFields : enquiry.customFields
    });

    res.json(enquiry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update vendor enquiry' });
  }
});

// DELETE /api/vendor/enquiries/:id - delete (Admin only)
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const enquiry = await VendorEnquiry.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!enquiry) return res.status(404).json({ error: 'Vendor enquiry not found' });
    await enquiry.destroy();
    res.json({ message: 'Vendor enquiry deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete vendor enquiry' });
  }
});

// GET /api/vendor/enquiries/:id/activities - Fetch activity timeline
router.get('/:id/activities', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const activities = await VendorEnquiryActivity.findAll({
      where: { VendorEnquiryId: req.params.id, CompanyId: req.user.CompanyId },
      include: [{ model: User, as: 'Creator', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(activities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// POST /api/vendor/enquiries/:id/activities - Log follow-up activity
router.post('/:id/activities', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const { activityType, notes, followUpDate } = req.body;
    const enquiry = await VendorEnquiry.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!enquiry) return res.status(404).json({ error: 'Vendor enquiry not found' });

    const newActivity = await VendorEnquiryActivity.create({
      VendorEnquiryId: enquiry.id,
      activityType: activityType || 'Note',
      notes,
      followUpDate,
      CreatedByUserId: req.user.id,
      CompanyId: req.user.CompanyId
    });

    res.status(201).json(newActivity);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to log follow-up activity' });
  }
});

// POST /api/vendor/enquiries/:id/attachments - Base64 Upload documents
router.post('/:id/attachments', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const { fileName, fileData, fileMime } = req.body;
    if (!fileName || !fileData) {
      return res.status(400).json({ error: 'File name and file content are required.' });
    }

    const enquiry = await VendorEnquiry.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!enquiry) return res.status(404).json({ error: 'Vendor enquiry not found' });

    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'vendor_enquiries');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const uniqueFileName = `${baseName}_${Date.now()}${ext}`;
    const filePath = path.join(uploadsDir, uniqueFileName);

    const buffer = Buffer.from(fileData, 'base64');
    fs.writeFileSync(filePath, buffer);

    const relativePath = `/uploads/vendor_enquiries/${uniqueFileName}`;

    const attachment = await VendorEnquiryAttachment.create({
      VendorEnquiryId: enquiry.id,
      fileName,
      filePath: relativePath,
      fileMime,
      CompanyId: req.user.CompanyId
    });

    await VendorEnquiryActivity.create({
      VendorEnquiryId: enquiry.id,
      activityType: 'System',
      notes: `Document attached: ${fileName}`,
      CompanyId: req.user.CompanyId
    });

    res.status(201).json(attachment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to attach document.' });
  }
});

// DELETE /api/vendor/enquiries/:id/attachments/:attId - Delete attachment
router.delete('/:id/attachments/:attId', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const attachment = await VendorEnquiryAttachment.findOne({
      where: { id: req.params.attId, VendorEnquiryId: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!attachment) return res.status(404).json({ error: 'Attachment not found.' });

    const fullPath = path.join(__dirname, '..', '..', attachment.filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    await VendorEnquiryActivity.create({
      VendorEnquiryId: req.params.id,
      activityType: 'System',
      notes: `Document removed: ${attachment.fileName}`,
      CompanyId: req.user.CompanyId
    });

    await attachment.destroy();
    res.json({ message: 'Attachment deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete attachment.' });
  }
});

// POST /api/vendor/enquiries/:id/convert-quotation - Convert Vendor Enquiry to Vendor Quotation
router.post('/:id/convert-quotation', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const enquiry = await VendorEnquiry.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [{ model: Vendor, as: 'Vendor' }]
    });
    if (!enquiry) return res.status(404).json({ error: 'Vendor enquiry not found.' });

    const quotationNumber = await generateQuotationCode(req.user.CompanyId);

    const quotation = await VendorQuotation.create({
      quotationNumber,
      VendorId: enquiry.VendorId,
      VendorEnquiryId: enquiry.id,
      status: 'Draft',
      totalAmount: enquiry.estimatedValue || 0.00,
      remarks: `Converted from Vendor Enquiry ${enquiry.enquiryNumber}. Details: ${enquiry.details || ''}`,
      items: enquiry.items || [],
      CompanyId: req.user.CompanyId
    });

    await enquiry.update({ status: 'Quotation Requested' });

    await VendorEnquiryActivity.create({
      VendorEnquiryId: enquiry.id,
      activityType: 'System',
      notes: `Converted to Vendor Quotation successfully with code ${quotationNumber}.`,
      CompanyId: req.user.CompanyId
    });

    res.status(201).json(quotation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to convert enquiry to quotation.' });
  }
});

export default router;
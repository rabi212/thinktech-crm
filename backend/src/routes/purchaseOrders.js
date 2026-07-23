import express from 'express';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PurchaseOrder from '../models/purchaseOrder.js';
import Vendor from '../models/vendor.js';
import VendorQuotation from '../models/vendorQuotation.js';
import PurchaseRequisition from '../models/purchaseRequisition.js';
import Warehouse from '../models/warehouse.js';
import CustomerMaster from '../models/customerMaster.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generatePOCode } from '../models/purchaseOrder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// GET /api/vendor/orders - list all with optional search
router.get('/', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const { search, status, vendorId, quotationId, requisitionId, warehouseId, dateFrom, dateTo } = req.query;
    const whereClause = { CompanyId: req.user.CompanyId };

    if (search) {
      whereClause[Op.or] = [
        { poNumber: { [Op.like]: `%${search}%` } },
        { '$Vendor.vendorName$': { [Op.like]: `%${search}%` } },
        { '$Vendor.vendorCode$': { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) whereClause.status = status;
    if (vendorId) whereClause.VendorId = vendorId;
    if (quotationId) whereClause.VendorQuotationId = quotationId;
    if (requisitionId) whereClause.PurchaseRequisitionId = requisitionId;
    if (warehouseId) whereClause.WarehouseId = warehouseId;
    if (dateFrom || dateTo) {
      whereClause.poDate = {};
      if (dateFrom) whereClause.poDate[Op.gte] = dateFrom;
      if (dateTo) whereClause.poDate[Op.lte] = dateTo;
    }

    const orders = await PurchaseOrder.findAll({
      where: whereClause,
      include: [
        { model: Vendor, as: 'Vendor', attributes: ['id', 'vendorCode', 'vendorName'] },
        { model: VendorQuotation, as: 'VendorQuotation', attributes: ['id', 'quotationNumber'] },
        { model: PurchaseRequisition, as: 'PurchaseRequisition', attributes: ['id', 'requisitionNumber'] },
        { model: Warehouse, as: 'Warehouse', attributes: ['id', 'name'] },
        { model: CustomerMaster, as: 'Customer', attributes: ['id', 'customerName'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

// GET /api/vendor/orders/:id - single order
router.get('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const order = await PurchaseOrder.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [
        { model: Vendor, as: 'Vendor' },
        { model: VendorQuotation, as: 'VendorQuotation' },
        { model: PurchaseRequisition, as: 'PurchaseRequisition' },
        { model: Warehouse, as: 'Warehouse' },
        { model: CustomerMaster, as: 'Customer' }
      ]
    });
    if (!order) return res.status(404).json({ error: 'Purchase order not found' });
    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch purchase order' });
  }
});

// POST /api/vendor/orders - create
router.post('/', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const {
      poNumber, poDate, VendorId, CustomerId, VendorQuotationId, PurchaseRequisitionId, WarehouseId,
      expectedDate, paymentTerms, status, items, totalAmount, remarks, customFields, file
    } = req.body;

    if (!VendorId) {
      return res.status(400).json({ error: 'Vendor is required.' });
    }

    let code = poNumber;
    if (!code || code.trim() === '') {
      code = await generatePOCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    let relativePath = null;
    if (file && file.fileData) {
      const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'pos');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const ext = path.extname(file.fileName) || '.pdf';
      const baseName = path.basename(file.fileName, ext).replace(/[^a-zA-Z0-9]/g, '_');
      const uniqueFileName = `${baseName}_${Date.now()}${ext}`;
      const filePath = path.join(uploadsDir, uniqueFileName);

      const buffer = Buffer.from(file.fileData, 'base64');
      fs.writeFileSync(filePath, buffer);
      relativePath = `/uploads/pos/${uniqueFileName}`;
    }

    const newOrder = await PurchaseOrder.create({
      poNumber: code,
      poDate: poDate || new Date(),
      VendorId,
      CustomerId: CustomerId || null,
      VendorQuotationId: VendorQuotationId || null,
      PurchaseRequisitionId: PurchaseRequisitionId || null,
      WarehouseId: WarehouseId || null,
      expectedDate: expectedDate || null,
      paymentTerms: paymentTerms?.trim(),
      status: status || 'Draft',
      items: items || [],
      totalAmount: totalAmount || 0,
      remarks: remarks?.trim(),
      customFields: customFields || null,
      poFilePath: relativePath,
      CompanyId: req.user.CompanyId
    });

    // Load associations for response
    const fullOrder = await PurchaseOrder.findOne({
      where: { id: newOrder.id },
      include: [
        { model: Vendor, as: 'Vendor', attributes: ['id', 'vendorCode', 'vendorName'] },
        { model: VendorQuotation, as: 'VendorQuotation', attributes: ['id', 'quotationNumber'] },
        { model: PurchaseRequisition, as: 'PurchaseRequisition', attributes: ['id', 'requisitionNumber'] },
        { model: Warehouse, as: 'Warehouse', attributes: ['id', 'name'] },
        { model: CustomerMaster, as: 'Customer', attributes: ['id', 'customerName'] }
      ]
    });

    res.status(201).json(fullOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create purchase order' });
  }
});

// PUT /api/vendor/orders/:id - update
router.put('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const order = await PurchaseOrder.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!order) return res.status(404).json({ error: 'Purchase order not found' });

    const {
      poDate, VendorId, CustomerId, VendorQuotationId, PurchaseRequisitionId, WarehouseId,
      expectedDate, paymentTerms, status, items, totalAmount, remarks, customFields, file
    } = req.body;

    let relativePath = order.poFilePath;
    if (file && file.fileData) {
      const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'pos');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const ext = path.extname(file.fileName) || '.pdf';
      const baseName = path.basename(file.fileName, ext).replace(/[^a-zA-Z0-9]/g, '_');
      const uniqueFileName = `${baseName}_${Date.now()}${ext}`;
      const filePath = path.join(uploadsDir, uniqueFileName);

      const buffer = Buffer.from(file.fileData, 'base64');
      fs.writeFileSync(filePath, buffer);
      relativePath = `/uploads/pos/${uniqueFileName}`;

      if (order.poFilePath) {
        const oldFullPath = path.join(__dirname, '..', '..', order.poFilePath);
        if (fs.existsSync(oldFullPath)) {
          fs.unlinkSync(oldFullPath);
        }
      }
    }

    await order.update({
      poDate: poDate || order.poDate,
      VendorId: VendorId || order.VendorId,
      CustomerId: CustomerId !== undefined ? (CustomerId || null) : order.CustomerId,
      VendorQuotationId: VendorQuotationId !== undefined ? (VendorQuotationId || null) : order.VendorQuotationId,
      PurchaseRequisitionId: PurchaseRequisitionId !== undefined ? (PurchaseRequisitionId || null) : order.PurchaseRequisitionId,
      WarehouseId: WarehouseId !== undefined ? (WarehouseId || null) : order.WarehouseId,
      expectedDate: expectedDate || order.expectedDate,
      paymentTerms: paymentTerms?.trim(),
      status: status || order.status,
      items: items || order.items,
      totalAmount: totalAmount !== undefined ? totalAmount : order.totalAmount,
      remarks: remarks?.trim(),
      customFields: customFields !== undefined ? customFields : order.customFields,
      poFilePath: relativePath
    });

    // Load associations for response
    const fullOrder = await PurchaseOrder.findOne({
      where: { id: order.id },
      include: [
        { model: Vendor, as: 'Vendor', attributes: ['id', 'vendorCode', 'vendorName'] },
        { model: VendorQuotation, as: 'VendorQuotation', attributes: ['id', 'quotationNumber'] },
        { model: PurchaseRequisition, as: 'PurchaseRequisition', attributes: ['id', 'requisitionNumber'] },
        { model: Warehouse, as: 'Warehouse', attributes: ['id', 'name'] },
        { model: CustomerMaster, as: 'Customer', attributes: ['id', 'customerName'] }
      ]
    });

    res.json(fullOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update purchase order' });
  }
});

// DELETE /api/vendor/orders/:id - delete (Admin only)
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const order = await PurchaseOrder.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!order) return res.status(404).json({ error: 'Purchase order not found' });
    await order.destroy();
    res.json({ message: 'Purchase order deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete purchase order' });
  }
});

export default router;
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import CustomerPurchaseOrder from '../models/customerPurchaseOrder.js';
import CustomerMaster from '../models/customerMaster.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GET /api/customer-pos — list all POs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pos = await CustomerPurchaseOrder.findAll({
      where: { CompanyId: req.user.CompanyId },
      include: [{ model: CustomerMaster, attributes: ['id', 'customerName'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(pos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch customer purchase orders' });
  }
});

// GET /api/customer-pos/:id — single PO
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const po = await CustomerPurchaseOrder.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [{ model: CustomerMaster }]
    });
    if (!po) return res.status(404).json({ error: 'Customer purchase order not found' });
    res.json(po);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch purchase order details' });
  }
});

// POST /api/customer-pos — log new PO (supports file upload via base64 encoding)
router.post('/', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const { poNumber, poDate, poAmount, CustomerMasterId, status, remarks, customFields, file } = req.body;

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

    const newPO = await CustomerPurchaseOrder.create({
      poNumber,
      poDate: poDate || new Date(),
      poAmount: poAmount || 0.00,
      poFilePath: relativePath,
      status: status || 'Active',
      customFields: customFields || null,
      CustomerMasterId,
      CompanyId: req.user.CompanyId
    });

    res.status(201).json(newPO);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to log customer purchase order' });
  }
});

// PUT /api/customer-pos/:id — update PO
router.put('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const po = await CustomerPurchaseOrder.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!po) return res.status(404).json({ error: 'Customer purchase order not found' });

    const { poNumber, poDate, poAmount, CustomerMasterId, status, remarks, customFields, file } = req.body;

    let relativePath = po.poFilePath;
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

      // Delete old file if existed
      if (po.poFilePath) {
        const oldFullPath = path.join(__dirname, '..', '..', po.poFilePath);
        if (fs.existsSync(oldFullPath)) {
          fs.unlinkSync(oldFullPath);
        }
      }
    }

    await po.update({
      poNumber: poNumber || po.poNumber,
      poDate: poDate || po.poDate,
      poAmount: poAmount !== undefined ? poAmount : po.poAmount,
      poFilePath: relativePath,
      status: status || po.status,
      customFields: customFields || po.customFields,
      CustomerMasterId: CustomerMasterId || po.CustomerMasterId
    });

    res.json(po);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update purchase order' });
  }
});

// DELETE /api/customer-pos/:id — delete PO
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const po = await CustomerPurchaseOrder.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!po) return res.status(404).json({ error: 'Customer purchase order not found' });

    // Delete file from disk if existed
    if (po.poFilePath) {
      const fullPath = path.join(__dirname, '..', '..', po.poFilePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    await po.destroy();
    res.json({ message: 'Purchase order deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete purchase order' });
  }
});

export default router;

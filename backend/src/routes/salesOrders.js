import express from 'express';
import SalesOrder from '../models/salesOrder.js';
import CustomerMaster from '../models/customerMaster.js';
import CustomerPurchaseOrder from '../models/customerPurchaseOrder.js';
import Quotation from '../models/quotation.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper: generate next sales order code
const generateSalesOrderCode = async (companyId) => {
  const year = new Date().getFullYear();
  const count = await SalesOrder.count({ 
    where: { CompanyId: companyId } 
  });
  const nextNum = String(count + 1).padStart(4, '0');
  return `SO-${year}-${nextNum}`;
};

// GET /api/sales-orders — list all
router.get('/', authenticateToken, async (req, res) => {
  try {
    const salesOrders = await SalesOrder.findAll({
      where: { CompanyId: req.user.CompanyId },
      include: [
        { model: CustomerMaster, as: 'Customer', attributes: ['id', 'customerName'] },
        { model: CustomerPurchaseOrder, as: 'CustomerPurchaseOrder', attributes: ['id', 'poNumber'] },
        { model: Quotation, as: 'Quotation', attributes: ['id', 'quotationNumber'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(salesOrders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch sales orders' });
  }
});

// GET /api/sales-orders/:id — single sales order
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [
        { model: CustomerMaster, as: 'Customer' },
        { model: CustomerPurchaseOrder, as: 'CustomerPurchaseOrder' },
        { model: Quotation, as: 'Quotation' }
      ]
    });
    if (!salesOrder) return res.status(404).json({ error: 'Sales order not found' });
    res.json(salesOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch sales order details' });
  }
});

// POST /api/sales-orders — create sales order
router.post('/', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const { 
      soNumber, soDate, CustomerMasterId, CustomerPurchaseOrderId, 
      QuotationId, items, totalAmount, status, remarks, customFields 
    } = req.body;

    let code = soNumber;
    if (!code || code.trim() === '' || code.trim() === 'Auto Generated') {
      code = await generateSalesOrderCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const newSalesOrder = await SalesOrder.create({
      soNumber: code,
      soDate: soDate || new Date(),
      CustomerMasterId,
      CustomerPurchaseOrderId: CustomerPurchaseOrderId || null,
      QuotationId: QuotationId || null,
      items: items || [],
      totalAmount: totalAmount || 0.00,
      status: status || 'Draft',
      remarks: remarks || null,
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });

    res.status(201).json(newSalesOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create sales order' });
  }
});

// PUT /api/sales-orders/:id — update sales order
router.put('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!salesOrder) return res.status(404).json({ error: 'Sales order not found' });

    const { 
      soDate, CustomerMasterId, CustomerPurchaseOrderId, 
      QuotationId, items, totalAmount, status, remarks, customFields 
    } = req.body;

    await salesOrder.update({
      soDate: soDate || salesOrder.soDate,
      CustomerMasterId: CustomerMasterId || salesOrder.CustomerMasterId,
      CustomerPurchaseOrderId: CustomerPurchaseOrderId !== undefined ? CustomerPurchaseOrderId : salesOrder.CustomerPurchaseOrderId,
      QuotationId: QuotationId !== undefined ? QuotationId : salesOrder.QuotationId,
      items: items || salesOrder.items,
      totalAmount: totalAmount !== undefined ? totalAmount : salesOrder.totalAmount,
      status: status || salesOrder.status,
      remarks: remarks || salesOrder.remarks,
      customFields: customFields || salesOrder.customFields
    });

    res.json(salesOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update sales order' });
  }
});

// DELETE /api/sales-orders/:id — delete sales order
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!salesOrder) return res.status(404).json({ error: 'Sales order not found' });

    await salesOrder.destroy();
    res.json({ message: 'Sales order deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete sales order' });
  }
});

export default router;

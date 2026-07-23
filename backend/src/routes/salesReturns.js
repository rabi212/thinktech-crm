import express from 'express';
import SalesReturn from '../models/salesReturn.js';
import Invoice from '../models/invoice.js';
import CreditNote from '../models/creditNote.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper: generate next sales return code
const generateSalesReturnCode = async (companyId) => {
  const year = new Date().getFullYear();
  const count = await SalesReturn.count({ 
    where: { CompanyId: companyId } 
  });
  const nextNum = String(count + 1).padStart(4, '0');
  return `RTN-${year}-${nextNum}`;
};

// GET /api/sales-returns — list all returns
router.get('/', authenticateToken, async (req, res) => {
  try {
    const returns = await SalesReturn.findAll({
      where: { CompanyId: req.user.CompanyId },
      include: [
        { model: Invoice, as: 'Invoice', attributes: ['id', 'invoiceNumber', 'clientName'] },
        { model: CreditNote, as: 'CreditNote', attributes: ['id', 'creditNoteNumber'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(returns);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch sales returns' });
  }
});

// GET /api/sales-returns/:id — single sales return detail
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const sReturn = await SalesReturn.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [
        { model: Invoice, as: 'Invoice' },
        { model: CreditNote, as: 'CreditNote' }
      ]
    });
    if (!sReturn) return res.status(404).json({ error: 'Sales return not found' });
    res.json(sReturn);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch sales return details' });
  }
});

// POST /api/sales-returns — log new sales return
router.post('/', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const { 
      returnNumber, returnDate, InvoiceId, CreditNoteId, items, remarks, customFields 
    } = req.body;

    let code = returnNumber;
    if (!code || code.trim() === '' || code.trim() === 'Auto Generated') {
      code = await generateSalesReturnCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const newReturn = await SalesReturn.create({
      returnNumber: code,
      returnDate: returnDate || new Date(),
      InvoiceId,
      CreditNoteId: CreditNoteId || null,
      items: items || [],
      remarks: remarks || null,
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });

    res.status(201).json(newReturn);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to log sales return' });
  }
});

// PUT /api/sales-returns/:id — update sales return
router.put('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const sReturn = await SalesReturn.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!sReturn) return res.status(404).json({ error: 'Sales return not found' });

    const { 
      returnDate, CreditNoteId, items, remarks, customFields 
    } = req.body;

    await sReturn.update({
      returnDate: returnDate || sReturn.returnDate,
      CreditNoteId: CreditNoteId !== undefined ? CreditNoteId : sReturn.CreditNoteId,
      items: items || sReturn.items,
      remarks: remarks !== undefined ? remarks : sReturn.remarks,
      customFields: customFields || sReturn.customFields
    });

    res.json(sReturn);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update sales return' });
  }
});

// DELETE /api/sales-returns/:id — delete sales return log
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const sReturn = await SalesReturn.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!sReturn) return res.status(404).json({ error: 'Sales return not found' });

    await sReturn.destroy();
    res.json({ message: 'Sales return log deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete sales return log' });
  }
});

export default router;

import express from 'express';
import CreditNote from '../models/creditNote.js';
import Invoice from '../models/invoice.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper: generate next credit note code
const generateCreditNoteCode = async (companyId) => {
  const year = new Date().getFullYear();
  const count = await CreditNote.count({ 
    where: { CompanyId: companyId } 
  });
  const nextNum = String(count + 1).padStart(4, '0');
  return `CN-${year}-${nextNum}`;
};

// GET /api/credit-notes — list all
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notes = await CreditNote.findAll({
      where: { CompanyId: req.user.CompanyId },
      include: [{ model: Invoice, as: 'Invoice', attributes: ['id', 'invoiceNumber', 'clientName'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(notes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch credit notes' });
  }
});

// GET /api/credit-notes/:id — single credit note
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const note = await CreditNote.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [{ model: Invoice, as: 'Invoice' }]
    });
    if (!note) return res.status(404).json({ error: 'Credit note not found' });
    res.json(note);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch credit note details' });
  }
});

// POST /api/credit-notes — create credit note
router.post('/', authenticateToken, requireRole(['Admin', 'AccountsUser']), async (req, res) => {
  try {
    const { 
      creditNoteNumber, date, InvoiceId, amount, reason, items, customFields 
    } = req.body;

    let code = creditNoteNumber;
    if (!code || code.trim() === '' || code.trim() === 'Auto Generated') {
      code = await generateCreditNoteCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const newNote = await CreditNote.create({
      creditNoteNumber: code,
      date: date || new Date(),
      InvoiceId,
      amount: amount || 0.00,
      reason: reason || null,
      items: items || [],
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });

    res.status(201).json(newNote);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create credit note' });
  }
});

// PUT /api/credit-notes/:id — update credit note
router.put('/:id', authenticateToken, requireRole(['Admin', 'AccountsUser']), async (req, res) => {
  try {
    const { creditNoteNumber, date, InvoiceId, amount, reason, items, customFields } = req.body;
    
    const note = await CreditNote.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!note) return res.status(404).json({ error: 'Credit note not found' });

    // Update the note
    await note.update({
      creditNoteNumber: creditNoteNumber || note.creditNoteNumber,
      date: date || note.date,
      InvoiceId: InvoiceId || note.InvoiceId,
      amount: amount !== undefined ? amount : note.amount,
      reason: reason !== undefined ? reason : note.reason,
      items: items || note.items,
      customFields: customFields || note.customFields
    });

    res.json(note);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update credit note' });
  }
});

// DELETE /api/credit-notes/:id — delete credit note
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const note = await CreditNote.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!note) return res.status(404).json({ error: 'Credit note not found' });

    await note.destroy();
    res.json({ message: 'Credit note deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete credit note' });
  }
});

export default router;

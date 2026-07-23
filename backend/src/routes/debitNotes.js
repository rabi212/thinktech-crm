import express from 'express';
import DebitNote from '../models/debitNote.js';
import Invoice from '../models/invoice.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper: generate next debit note code
const generateDebitNoteCode = async (companyId) => {
  const year = new Date().getFullYear();
  const count = await DebitNote.count({ 
    where: { CompanyId: companyId } 
  });
  const nextNum = String(count + 1).padStart(4, '0');
  return `DN-${year}-${nextNum}`;
};

// GET /api/debit-notes — list all
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notes = await DebitNote.findAll({
      where: { CompanyId: req.user.CompanyId },
      include: [{ model: Invoice, as: 'Invoice', attributes: ['id', 'invoiceNumber', 'clientName'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(notes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch debit notes' });
  }
});

// GET /api/debit-notes/:id — single debit note
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const note = await DebitNote.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [{ model: Invoice, as: 'Invoice' }]
    });
    if (!note) return res.status(404).json({ error: 'Debit note not found' });
    res.json(note);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch debit note details' });
  }
});

// POST /api/debit-notes — create debit note
router.post('/', authenticateToken, requireRole(['Admin', 'AccountsUser']), async (req, res) => {
  try {
    const { 
      debitNoteNumber, date, InvoiceId, amount, reason, items, customFields 
    } = req.body;

    let code = debitNoteNumber;
    if (!code || code.trim() === '' || code.trim() === 'Auto Generated') {
      code = await generateDebitNoteCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const newNote = await DebitNote.create({
      debitNoteNumber: code,
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
    res.status(500).json({ error: 'Failed to create debit note' });
  }
});

// PUT /api/debit-notes/:id — update debit note
router.put('/:id', authenticateToken, requireRole(['Admin', 'AccountsUser']), async (req, res) => {
  try {
    const { debitNoteNumber, date, InvoiceId, amount, reason, items, customFields } = req.body;
    
    const note = await DebitNote.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!note) return res.status(404).json({ error: 'Debit note not found' });

    // Update the note
    await note.update({
      debitNoteNumber: debitNoteNumber || note.debitNoteNumber,
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
    res.status(500).json({ error: 'Failed to update debit note' });
  }
});

// DELETE /api/debit-notes/:id — delete debit note
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const note = await DebitNote.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!note) return res.status(404).json({ error: 'Debit note not found' });

    await note.destroy();
    res.json({ message: 'Debit note deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete debit note' });
  }
});

export default router;

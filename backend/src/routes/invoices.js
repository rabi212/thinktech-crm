import express from 'express';
import Invoice from '../models/invoice.js';
import SalesOrder from '../models/salesOrder.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { sendEmail } from '../utils/emailService.js';

const router = express.Router();

// Helper: generate next invoice code
const generateInvoiceCode = async (companyId) => {
  const year = new Date().getFullYear();
  const count = await Invoice.count({ 
    where: { CompanyId: companyId } 
  });
  const nextNum = String(count + 1).padStart(4, '0');
  return `INV-${year}-${nextNum}`;
};

// GET /api/invoices — list all
router.get('/', authenticateToken, async (req, res) => {
  try {
    const invoices = await Invoice.findAll({ 
      where: { CompanyId: req.user.CompanyId },
      include: [{ model: SalesOrder, as: 'SalesOrder', attributes: ['id', 'soNumber'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(invoices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// GET /api/invoices/:id — single invoice details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [{ model: SalesOrder, as: 'SalesOrder' }]
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch invoice details' });
  }
});

// POST /api/invoices — generate invoice
router.post('/', authenticateToken, requireRole(['Admin', 'AccountsUser']), async (req, res) => {
  try {
    const { 
      invoiceNumber, invoiceDate, dueDate, clientName, items, 
      totalAmount, amountPaid, status, SalesOrderId, customFields 
    } = req.body;

    let code = invoiceNumber;
    if (!code || code.trim() === '' || code.trim() === 'Auto Generated') {
      code = await generateInvoiceCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const newInvoice = await Invoice.create({
      invoiceNumber: code,
      invoiceDate: invoiceDate || new Date(),
      dueDate: dueDate || null,
      clientName,
      items: items || [],
      totalAmount: totalAmount || 0.00,
      amountPaid: amountPaid || 0.00,
      status: status || 'Unpaid',
      SalesOrderId: SalesOrderId || null,
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });

    // If generated from Sales Order, update SO status to Dispatched/Closed
    if (SalesOrderId) {
      await SalesOrder.update({ status: 'Closed' }, { where: { id: SalesOrderId } });
    }

    res.status(201).json(newInvoice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

// PUT /api/invoices/:id — update invoice
router.put('/:id', authenticateToken, requireRole(['Admin', 'AccountsUser']), async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const { 
      invoiceDate, dueDate, clientName, items, 
      totalAmount, amountPaid, status, SalesOrderId, customFields 
    } = req.body;

    await invoice.update({
      invoiceDate: invoiceDate || invoice.invoiceDate,
      dueDate: dueDate !== undefined ? dueDate : invoice.dueDate,
      clientName: clientName || invoice.clientName,
      items: items || invoice.items,
      totalAmount: totalAmount !== undefined ? totalAmount : invoice.totalAmount,
      amountPaid: amountPaid !== undefined ? amountPaid : invoice.amountPaid,
      status: status || invoice.status,
      SalesOrderId: SalesOrderId !== undefined ? SalesOrderId : invoice.SalesOrderId,
      customFields: customFields || invoice.customFields
    });

    res.json(invoice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// POST /api/invoices/:id/payment — record payment
router.post('/:id/payment', authenticateToken, requireRole(['Admin', 'AccountsUser']), async (req, res) => {
  try {
    const { amount } = req.body;
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    
    const paid = parseFloat(invoice.amountPaid) + parseFloat(amount);
    let status = 'Partially Paid';
    if (paid >= parseFloat(invoice.totalAmount)) {
      status = 'Paid';
    }

    await invoice.update({ amountPaid: paid, status });
    res.json(invoice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// DELETE /api/invoices/:id — delete invoice
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    await invoice.destroy();
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

// POST /api/invoices/:id/email — send invoice via email
router.post('/:id/email', authenticateToken, async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    
    if (!to || !subject || !message) {
      return res.status(400).json({ error: 'Email, subject, and message are required' });
    }

    const invoice = await Invoice.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Create HTML email body
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <div style="white-space: pre-wrap; line-height: 1.6; margin-bottom: 20px;">
          ${message}
        </div>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">
          <strong>Invoice Details:</strong><br/>
          Invoice #: ${invoice.invoiceNumber}<br/>
          Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}<br/>
          Total Amount: ₹${parseFloat(invoice.totalAmount).toLocaleString('en-IN')}<br/>
          Amount Paid: ₹${parseFloat(invoice.amountPaid || 0).toLocaleString('en-IN')}<br/>
          Balance Due: ₹${(parseFloat(invoice.totalAmount) - parseFloat(invoice.amountPaid || 0)).toLocaleString('en-IN')}<br/>
          Status: ${invoice.status}
        </p>
      </div>
    `;

    // Send email
    await sendEmail(to, subject, htmlContent);
    
    res.json({ message: 'Invoice emailed successfully' });
  } catch (error) {
    console.error('Error sending invoice email:', error);
    res.status(500).json({ error: 'Failed to send email: ' + error.message });
  }
});

export default router;

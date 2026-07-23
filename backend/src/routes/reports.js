import express from 'express';
import Invoice from '../models/invoice.js';
import Expense from '../models/expense.js';
import Enquiry from '../models/enquiry.js';
import Lead from '../models/lead.js';
import Quotation from '../models/quotation.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const salesTotal = await Invoice.sum('totalAmount', { where: { CompanyId: req.user.CompanyId } }) || 0;
    const paymentsTotal = await Invoice.sum('amountPaid', { where: { CompanyId: req.user.CompanyId } }) || 0;
    const expensesTotal = await Expense.sum('amount', { 
      where: { CompanyId: req.user.CompanyId, status: 'Approved' } 
    }) || 0;
    const invoicesCount = await Invoice.count({ where: { CompanyId: req.user.CompanyId } });
    const recentInvoices = await Invoice.findAll({ 
      where: { CompanyId: req.user.CompanyId },
      limit: 5,
      order: [['createdAt', 'DESC']]
    });
    const recentEnquiries = await Enquiry.findAll({
      where: { CompanyId: req.user.CompanyId },
      limit: 5,
      order: [['createdAt', 'DESC']]
    });

    const totalLeads = await Lead.count({ where: { CompanyId: req.user.CompanyId } });
    const totalEnquiries = await Enquiry.count({ where: { CompanyId: req.user.CompanyId } });
    const totalQuotations = await Quotation.count({ where: { CompanyId: req.user.CompanyId } });

    const netProfit = parseFloat(paymentsTotal) - parseFloat(expensesTotal);

    res.json({
      salesTotal,
      paymentsTotal,
      expensesTotal,
      invoicesCount,
      netProfit,
      recentInvoices,
      recentEnquiries,
      totalLeads,
      totalEnquiries,
      totalQuotations
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;

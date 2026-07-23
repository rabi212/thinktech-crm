import express from 'express';
import { Op } from 'sequelize';
import CustomerMaster from '../models/customerMaster.js';
import Enquiry from '../models/enquiry.js';
import Quotation from '../models/quotation.js';
import Invoice from '../models/invoice.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper: generate next customer code for a company
const generateCustomerCode = async (companyId) => {
  const count = await CustomerMaster.count({ where: { CompanyId: companyId } });
  const nextNum = String(count + 1).padStart(4, '0');
  return `CUST-${nextNum}`;
};

// GET /api/master/customers — list all with optional search
router.get('/', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const { search } = req.query;
    const whereClause = { CompanyId: req.user.CompanyId };

    if (search) {
      whereClause[Op.or] = [
        { customerName: { [Op.like]: `%${search}%` } },
        { customerCode: { [Op.like]: `%${search}%` } },
        { mobileNumber: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { companyName: { [Op.like]: `%${search}%` } }
      ];
    }

    const customers = await CustomerMaster.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });
    res.json(customers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET /api/master/customers/:id — single customer
router.get('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const customer = await CustomerMaster.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// GET /api/master/customers/:id/history — customer transaction history
router.get('/:id/history', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const customer = await CustomerMaster.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const name = customer.customerName;

    const enquiries = await Enquiry.findAll({
      where: { CustomerMasterId: customer.id, CompanyId: req.user.CompanyId },
      order: [['createdAt', 'DESC']]
    });
    const quotations = await Quotation.findAll({
      where: { clientName: name, CompanyId: req.user.CompanyId },
      order: [['createdAt', 'DESC']]
    });
    const invoices = await Invoice.findAll({
      where: { clientName: name, CompanyId: req.user.CompanyId },
      order: [['createdAt', 'DESC']]
    });

    res.json({ customer, enquiries, quotations, invoices });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch customer history' });
  }
});

// POST /api/master/customers — create
router.post('/', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const {
      customerName, companyName, contactPerson, mobileNumber, email,
      gstNumber, billingAddress, shippingAddress, city, state, country,
      creditLimit, paymentTerms, status, customerCode, customFields
    } = req.body;

    let code = customerCode;
    if (!code || code.trim() === '') {
      code = await generateCustomerCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const newCustomer = await CustomerMaster.create({
      customerCode: code,
      customerName,
      companyName,
      contactPerson,
      mobileNumber,
      email,
      gstNumber,
      billingAddress,
      shippingAddress,
      city,
      state,
      country: country || 'India',
      creditLimit: creditLimit || 0,
      paymentTerms: paymentTerms || 'Immediate',
      status: status || 'Active',
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });

    res.status(201).json(newCustomer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// PUT /api/master/customers/:id — update
router.put('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const customer = await CustomerMaster.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const {
      customerName, companyName, contactPerson, mobileNumber, email,
      gstNumber, billingAddress, shippingAddress, city, state, country,
      creditLimit, paymentTerms, status, customerCode, customFields
    } = req.body;

    await customer.update({
      customerCode: customerCode !== undefined ? (customerCode?.trim() || customer.customerCode) : customer.customerCode,
      customerName,
      companyName,
      contactPerson,
      mobileNumber,
      email,
      gstNumber,
      billingAddress,
      shippingAddress,
      city,
      state,
      country,
      creditLimit,
      paymentTerms,
      status,
      customFields: customFields !== undefined ? customFields : customer.customFields
    });

    res.json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// DELETE /api/master/customers/:id — delete (Admin only)
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const customer = await CustomerMaster.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    await customer.destroy();
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

export default router;

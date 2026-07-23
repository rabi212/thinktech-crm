import express from 'express';
import { Op } from 'sequelize';
import Vendor from '../models/vendor.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper: generate next vendor code for a company
const generateVendorCode = async (companyId) => {
  const count = await Vendor.count({ where: { CompanyId: companyId } });
  const nextNum = String(count + 1).padStart(4, '0');
  return `VND-${nextNum}`;
};

// GET /api/master/vendors — list all with optional search
router.get('/', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const { search } = req.query;
    const whereClause = { CompanyId: req.user.CompanyId };

    if (search) {
      whereClause[Op.or] = [
        { vendorName: { [Op.like]: `%${search}%` } },
        { vendorCode: { [Op.like]: `%${search}%` } },
        { companyName: { [Op.like]: `%${search}%` } },
        { vendorType: { [Op.like]: `%${search}%` } },
        { vendorCategory: { [Op.like]: `%${search}%` } },
        { contactPerson: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { mobileNumber: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } },
        { state: { [Op.like]: `%${search}%` } }
      ];
    }

    const vendors = await Vendor.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });
    res.json(vendors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// GET /api/master/vendors/:id — single vendor
router.get('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const vendor = await Vendor.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json(vendor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
});

// POST /api/master/vendors — create
router.post('/', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const {
      vendorName, vendorType, companyName, contactPerson, mobileNumber, email,
      address, city, state, pinCode, gstNumber, panNumber, msmeNumber,
      vendorCategory, bankName, bankAccountNumber, ifscCode, paymentTerms, status, vendorCode, customFields
    } = req.body;

    if (!vendorName || vendorName.trim() === '') {
      return res.status(400).json({ error: 'Vendor name is required.' });
    }

    let code = vendorCode;
    if (!code || code.trim() === '') {
      code = await generateVendorCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const newVendor = await Vendor.create({
      vendorCode: code,
      vendorName: vendorName.trim(),
      vendorType: vendorType || 'Supplier',
      companyName: companyName?.trim(),
      contactPerson: contactPerson?.trim(),
      mobileNumber: mobileNumber?.trim(),
      email: email?.trim(),
      address: address?.trim(),
      city: city?.trim(),
      state: state?.trim(),
      pinCode: pinCode?.trim(),
      gstNumber: gstNumber?.trim(),
      panNumber: panNumber?.trim(),
      msmeNumber: msmeNumber?.trim(),
      vendorCategory: vendorCategory?.trim(),
      bankName: bankName?.trim(),
      bankAccountNumber: bankAccountNumber?.trim(),
      ifscCode: ifscCode?.trim(),
      paymentTerms: paymentTerms || 'Immediate',
      status: status || 'Active',
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });

    res.status(201).json(newVendor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});

// PUT /api/master/vendors/:id — update
router.put('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const vendor = await Vendor.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    const {
      vendorName, vendorType, companyName, contactPerson, mobileNumber, email,
      address, city, state, pinCode, gstNumber, panNumber, msmeNumber,
      vendorCategory, bankName, bankAccountNumber, ifscCode, paymentTerms, status, vendorCode, customFields
    } = req.body;

    if (!vendorName || vendorName.trim() === '') {
      return res.status(400).json({ error: 'Vendor name is required.' });
    }

    await vendor.update({
      vendorCode: vendorCode !== undefined ? (vendorCode?.trim() || vendor.vendorCode) : vendor.vendorCode,
      vendorName: vendorName.trim(),
      vendorType,
      companyName: companyName?.trim(),
      contactPerson: contactPerson?.trim(),
      mobileNumber: mobileNumber?.trim(),
      email: email?.trim(),
      address: address?.trim(),
      city: city?.trim(),
      state: state?.trim(),
      pinCode: pinCode?.trim(),
      gstNumber: gstNumber?.trim(),
      panNumber: panNumber?.trim(),
      msmeNumber: msmeNumber?.trim(),
      vendorCategory: vendorCategory?.trim(),
      bankName: bankName?.trim(),
      bankAccountNumber: bankAccountNumber?.trim(),
      ifscCode: ifscCode?.trim(),
      paymentTerms: paymentTerms || 'Immediate',
      status,
      customFields: customFields !== undefined ? customFields : vendor.customFields
    });

    res.json(vendor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

// DELETE /api/master/vendors/:id — delete (Admin only)
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const vendor = await Vendor.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    await vendor.destroy();
    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete vendor' });
  }
});

export default router;

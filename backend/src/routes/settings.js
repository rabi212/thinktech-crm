import express from 'express';
import bcrypt from 'bcryptjs';
import Company from '../models/company.js';
import User from '../models/user.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// ── GET company settings (ERP)
router.get('/', authenticateToken, requireRole(['Admin', 'Superadmin', 'Management']), async (req, res) => {
  try {
    const company = await Company.findByPk(req.user.CompanyId);
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// ── PUT ERP settings (financial)
router.put('/', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { financialYear, gstNumber, taxRate, currency, customFields } = req.body;
  try {
    const company = await Company.findByPk(req.user.CompanyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    await company.update({ 
      financialYear, 
      gstNumber, 
      taxRate, 
      currency,
      customFields: customFields !== undefined ? customFields : company.customFields
    });
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ── GET business profile
router.get('/business-profile', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const company = await Company.findByPk(req.user.CompanyId, {
      attributes: ['id', 'name', 'email', 'phone', 'address', 'website', 'gstNumber']
    });
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch business profile' });
  }
});

// ── PUT business profile
router.put('/business-profile', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { name, email, phone, address, website, gstNumber } = req.body;
  try {
    const company = await Company.findByPk(req.user.CompanyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    if (!name || name.trim() === '') return res.status(400).json({ error: 'Business name is required.' });
    await company.update({ name: name.trim(), email: email?.trim(), phone, address, website, gstNumber });
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update business profile' });
  }
});

// ── GET personal profile (logged-in user)
router.get('/personal-profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'role']
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── PUT personal profile
router.put('/personal-profile', authenticateToken, async (req, res) => {
  const { name, email, currentPassword, newPassword } = req.body;
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updates = {};

    if (name && name.trim()) updates.name = name.trim();
    if (email && email.trim()) updates.email = email.trim();

    // Password change
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password is required to set a new password.' });
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(401).json({ error: 'Current password is incorrect.' });
      if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });
      updates.password = await bcrypt.hash(newPassword, 10);
    }

    await user.update(updates);
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;

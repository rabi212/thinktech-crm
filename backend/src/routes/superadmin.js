import express from 'express';
import jwt from 'jsonwebtoken';
import Company from '../models/company.js';
import User from '../models/user.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'thinktech_crm_secret_key';

// Get all companies (Pending and Active)
router.get('/companies', authenticateToken, requireRole(['Superadmin']), async (req, res) => {
  try {
    const companies = await Company.findAll({ order: [['createdAt', 'DESC']] });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Create new company directly
router.post('/companies', authenticateToken, requireRole(['Superadmin']), async (req, res) => {
  const { 
    name, email, phone, password,
    companyName, companyEmail, companyPhone, adminName, adminEmail, adminPassword 
  } = req.body;

  const finalCompanyName = companyName || name;
  const finalCompanyEmail = companyEmail || email;
  const finalCompanyPhone = companyPhone || phone;
  const finalAdminName = adminName || `${finalCompanyName} Admin`;
  const finalAdminEmail = adminEmail || `admin@${finalCompanyName.toLowerCase().replace(/\s+/g, '')}.com`;
  const finalAdminPassword = adminPassword || password || 'admin123';

  if (!finalCompanyName || !finalCompanyEmail) {
    return res.status(400).json({ error: 'Company Name and Email are required' });
  }
  try {
    const newCompany = await Company.create({ 
      name: finalCompanyName, 
      email: finalCompanyEmail, 
      phone: finalCompanyPhone, 
      status: 'Active' 
    });
    
    await User.create({
      name: finalAdminName,
      email: finalAdminEmail,
      password: finalAdminPassword,
      role: 'Admin',
      CompanyId: newCompany.id
    });
    res.status(201).json({
      company: newCompany,
      message: `Company created. Admin Account: ${finalAdminEmail} (password: ${finalAdminPassword})`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// Impersonate Company Admin
router.post('/companies/:id/impersonate', authenticateToken, requireRole(['Superadmin']), async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    if (company.status !== 'Active') {
      return res.status(400).json({ error: 'Cannot impersonate an inactive or pending company.' });
    }

    // Find company admin user
    let userToImpersonate = await User.findOne({ 
      where: { CompanyId: req.params.id, role: 'Admin' },
      include: [Company]
    });

    if (!userToImpersonate) {
      userToImpersonate = await User.findOne({
        where: { CompanyId: req.params.id },
        include: [Company]
      });
    }

    if (!userToImpersonate) {
      return res.status(404).json({ error: 'No user accounts found for this company to impersonate.' });
    }

    // Generate JWT Token for this tenant user
    const token = jwt.sign(
      {
        id: userToImpersonate.id,
        email: userToImpersonate.email,
        role: userToImpersonate.role,
        CompanyId: userToImpersonate.CompanyId
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      token,
      user: {
        id: userToImpersonate.id,
        name: userToImpersonate.name,
        email: userToImpersonate.email,
        role: userToImpersonate.role,
        CompanyId: userToImpersonate.CompanyId,
        CompanyName: userToImpersonate.Company ? userToImpersonate.Company.name : 'System'
      }
    });
  } catch (error) {
    console.error('Impersonation error:', error);
    res.status(500).json({ error: 'Failed to impersonate tenant user.' });
  }
});

// Update company status
router.put('/companies/:id/status', authenticateToken, requireRole(['Superadmin']), async (req, res) => {
  const { status } = req.body; 
  if (!status) return res.status(400).json({ error: 'Status is required' });

  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    
    await company.update({ status });
    res.json({ message: `Company status updated to ${status}`, company });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update company status' });
  }
});

// Update company details
router.put('/companies/:id', authenticateToken, requireRole(['Superadmin']), async (req, res) => {
  const { name, email, phone } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Company Name and Email are required' });
  }
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    await company.update({ name, email, phone });
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update company details' });
  }
});

// Delete/Reject company registration
router.delete('/companies/:id', authenticateToken, requireRole(['Superadmin']), async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    
    await company.destroy();
    res.json({ message: 'Company registration rejected and removed.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

export default router;

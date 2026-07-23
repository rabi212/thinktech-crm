import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import sequelize from '../config/db.js';
import User from '../models/user.js';
import Company from '../models/company.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'thinktech_crm_secret_key';

// Signup Endpoint (Self-registration for new Companies/Tenants)
router.post('/signup', async (req, res) => {
  const { companyName, companyEmail, companyPhone, adminName, adminEmail, adminPassword } = req.body;
  
  if (!companyName || !companyEmail || !adminName || !adminEmail || !adminPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const transaction = await sequelize.transaction();

  try {
    // Check if email already in use
    const emailExists = await User.findOne({ where: { email: adminEmail } });
    if (emailExists) {
      await transaction.rollback();
      return res.status(400).json({ error: 'User Email address is already in use.' });
    }

    // Create Company in 'Pending' status (default)
    const company = await Company.create({
      name: companyName,
      email: companyEmail,
      phone: companyPhone,
      status: 'Pending'
    }, { transaction });

    // Create Admin User
    await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'Admin',
      CompanyId: company.id
    }, { transaction });

    await transaction.commit();
    res.status(201).json({ message: 'Registration successful. Your account is pending Superadmin approval.' });
  } catch (error) {
    await transaction.rollback();
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to complete registration' });
  }
});

// Login Endpoint
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ 
      where: { email },
      include: [Company]
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status === 'Inactive') {
      return res.status(403).json({ error: 'Your account has been deactivated.' });
    }

    // If tenant user, verify Company status
    if (user.CompanyId) {
      const company = user.Company;
      if (!company) {
        return res.status(404).json({ error: 'Associated company not found.' });
      }
      if (company.status === 'Pending') {
        return res.status(403).json({ error: 'Your company registration is pending approval by the Superadmin.' });
      }
      if (company.status === 'Inactive') {
        return res.status(403).json({ error: 'Your company account is currently inactive. Please contact support.' });
      }
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        CompanyId: user.CompanyId
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        CompanyId: user.CompanyId,
        CompanyName: user.Company ? user.Company.name : 'System'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An error occurred during login' });
  }
});

// Profile Endpoint
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'role', 'CompanyId'],
      include: [{ model: Company, attributes: ['name', 'status', 'financialYear', 'gstNumber', 'taxRate', 'currency'] }]
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── Forgot Password — Step 1: Verify email exists, return reset token
const resetTokens = new Map(); // { token -> { userId, expiresAt } }

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email address.' });
    }
    // Generate 6-digit token valid for 15 minutes
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    resetTokens.set(token, { userId: user.id, expiresAt: Date.now() + 15 * 60 * 1000 });
    // Clean expired tokens
    for (const [t, d] of resetTokens) { if (d.expiresAt < Date.now()) resetTokens.delete(t); }
    res.json({ message: 'Account verified.', resetToken: token, userName: user.name });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process request.' });
  }
});

// ── Reset Password — Step 2: Validate token, set new password
router.post('/reset-password', async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  const data = resetTokens.get(resetToken);
  if (!data) return res.status(400).json({ error: 'Invalid or expired reset token.' });
  if (data.expiresAt < Date.now()) {
    resetTokens.delete(resetToken);
    return res.status(400).json({ error: 'Reset token has expired. Please start over.' });
  }
  try {
    const user = await User.findByPk(data.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    // Pass plain password — the User model's beforeUpdate hook will hash it automatically
    await user.update({ password: newPassword });
    resetTokens.delete(resetToken);
    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

export default router;

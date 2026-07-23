import express from 'express';
import Expense from '../models/expense.js';
import User from '../models/user.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    let expenses;
    if (['Admin', 'Management'].includes(req.user.role)) {
      expenses = await Expense.findAll({
        where: { CompanyId: req.user.CompanyId },
        include: [{ model: User, attributes: ['name'] }],
        order: [['createdAt', 'DESC']]
      });
    } else {
      expenses = await Expense.findAll({
        where: { UserId: req.user.id, CompanyId: req.user.CompanyId },
        include: [{ model: User, attributes: ['name'] }],
        order: [['createdAt', 'DESC']]
      });
    }
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { description, amount } = req.body;
  try {
    const newExpense = await Expense.create({
      description,
      amount,
      UserId: req.user.id,
      CompanyId: req.user.CompanyId
    });
    res.status(201).json(newExpense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log expense' });
  }
});

router.put('/:id/status', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { status } = req.body; // Approved or Rejected
  try {
    const expense = await Expense.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    await expense.update({ status });
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update expense status' });
  }
});

export default router;

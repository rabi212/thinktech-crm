import express from 'express';
import Client from '../models/client.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  if (req.user.role === 'Superadmin') return res.status(400).json({ error: 'Superadmin cannot access clients directly' });
  try {
    const clients = await Client.findAll({
      where: { CompanyId: req.user.CompanyId },
      order: [['createdAt', 'DESC']]
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  if (req.user.role === 'Superadmin') return res.status(400).json({ error: 'Superadmin cannot add clients' });
  const { name, contact, email, phone, status } = req.body;
  try {
    const newClient = await Client.create({
      name, contact, email, phone, status, CompanyId: req.user.CompanyId
    });
    res.status(201).json(newClient);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create client' });
  }
});

export default router;

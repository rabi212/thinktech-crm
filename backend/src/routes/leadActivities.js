import express from 'express';
import LeadActivity from '../models/leadActivity.js';
import Lead from '../models/lead.js';
import User from '../models/user.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/lead-activities/:leadId - Fetch all activities for a lead
router.get('/:leadId', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const activities = await LeadActivity.findAll({
      where: { LeadId: req.params.leadId, CompanyId: req.user.CompanyId },
      include: [
        { model: User, as: 'Creator', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(activities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch lead activities' });
  }
});

// POST /api/lead-activities - Create activity
router.post('/', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const { LeadId, activityType, notes, followUpDate } = req.body;

    const lead = await Lead.findOne({ where: { id: LeadId, CompanyId: req.user.CompanyId } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const newActivity = await LeadActivity.create({
      LeadId,
      activityType: activityType || 'Note',
      notes,
      followUpDate: followUpDate || null,
      CreatedByUserId: req.user.id,
      CompanyId: req.user.CompanyId
    });

    // Update parent Lead follow-up dates
    const now = new Date();
    await lead.update({
      lastFollowUpDate: now,
      nextFollowUpDate: followUpDate || lead.nextFollowUpDate
    });

    const fullActivity = await LeadActivity.findOne({
      where: { id: newActivity.id },
      include: [
        { model: User, as: 'Creator', attributes: ['id', 'name', 'email'] }
      ]
    });

    res.status(201).json(fullActivity);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create lead activity' });
  }
});

export default router;

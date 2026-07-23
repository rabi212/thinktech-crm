import express from 'express';
import { Op } from 'sequelize';
import PurchaseApproval from '../models/purchaseApproval.js';
import User from '../models/user.js';
import PurchaseRequisition from '../models/purchaseRequisition.js';
import PurchaseOrder from '../models/purchaseOrder.js';
import VendorBill from '../models/vendorBill.js';
import VendorPayment from '../models/vendorPayment.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generateApprovalCode } from '../models/purchaseApproval.js';

const router = express.Router();

// GET /api/vendor/approvals - list all with optional search
router.get('/', authenticateToken, requireRole(['Admin', 'Management']), async (req, res) => {
  try {
    const { search, status, module, referenceId, dateFrom, dateTo } = req.query;
    const whereClause = { CompanyId: req.user.CompanyId };

    if (search) {
      whereClause[Op.or] = [
        { approvalCode: { [Op.like]: `%${search}%` } },
        { referenceType: { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) whereClause.status = status;
    if (module) whereClause.module = module;
    if (referenceId) whereClause.referenceId = referenceId;
    if (dateFrom || dateTo) {
      whereClause.initiatedAt = {};
      if (dateFrom) whereClause.initiatedAt[Op.gte] = dateFrom;
      if (dateTo) whereClause.initiatedAt[Op.lte] = dateTo;
    }

    const approvals = await PurchaseApproval.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'InitiatedByUser', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(approvals);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch purchase approvals' });
  }
});

// GET /api/vendor/approvals/:id - single approval
router.get('/:id', authenticateToken, requireRole(['Admin', 'Management']), async (req, res) => {
  try {
    const approval = await PurchaseApproval.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [
        { model: User, as: 'InitiatedByUser', attributes: ['id', 'name'] }
      ]
    });
    if (!approval) return res.status(404).json({ error: 'Purchase approval not found' });
    res.json(approval);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch purchase approval' });
  }
});

// POST /api/vendor/approvals - create
router.post('/', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const {
      approvalCode, module, referenceId, referenceType, currentLevel, totalLevels,
      status, approvers, initiatedBy, remarks, customFields
    } = req.body;

    const refType = referenceType || module;

    if (!module || !referenceId || !refType || !initiatedBy) {
      return res.status(400).json({ error: 'Module, Reference ID, Reference Type, and Initiated By are required.' });
    }

    let code = approvalCode;
    if (!code || code.trim() === '') {
      code = await generateApprovalCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const newApproval = await PurchaseApproval.create({
      approvalCode: code,
      module,
      referenceId,
      referenceType: refType,
      currentLevel: currentLevel || 1,
      totalLevels: totalLevels || 1,
      status: status || 'Pending',
      approvers: approvers || [],
      initiatedBy,
      initiatedAt: new Date(),
      remarks: remarks?.trim(),
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });

    // Auto-update the status of the referenced document to show it is pending review
    try {
      if (module === 'PurchaseRequisition') {
        await PurchaseRequisition.update({ status: 'Submitted' }, { where: { id: referenceId, CompanyId: req.user.CompanyId } });
      } else if (module === 'PurchaseOrder') {
        await PurchaseOrder.update({ status: 'Pending Approval' }, { where: { id: referenceId, CompanyId: req.user.CompanyId } });
      } else if (module === 'VendorBill') {
        await VendorBill.update({ status: 'Pending' }, { where: { id: referenceId, CompanyId: req.user.CompanyId } });
      } else if (module === 'VendorPayment') {
        await VendorPayment.update({ status: 'Pending' }, { where: { id: referenceId, CompanyId: req.user.CompanyId } });
      }
    } catch (dbErr) {
      console.error('Failed to auto-update source document status on approval creation:', dbErr);
    }

    res.status(201).json(newApproval);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create purchase approval' });
  }
});

// PUT /api/vendor/approvals/:id - update
router.put('/:id', authenticateToken, requireRole(['Admin', 'Management']), async (req, res) => {
  try {
    const approval = await PurchaseApproval.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!approval) return res.status(404).json({ error: 'Purchase approval not found' });

    const {
      module, referenceId, referenceType, currentLevel, totalLevels,
      status, approvers, initiatedBy, completedAt, remarks, customFields
    } = req.body;

    const updateData = {
      module: module || approval.module,
      referenceId: referenceId || approval.referenceId,
      referenceType: referenceType || approval.referenceType,
      currentLevel: currentLevel !== undefined ? currentLevel : approval.currentLevel,
      totalLevels: totalLevels !== undefined ? totalLevels : approval.totalLevels,
      status: status || approval.status,
      approvers: approvers !== undefined ? approvers : approval.approvers,
      initiatedBy: initiatedBy || approval.initiatedBy,
      completedAt: completedAt || approval.completedAt,
      remarks: remarks?.trim(),
      customFields: customFields !== undefined ? customFields : approval.customFields
    };

    // Auto-set completedAt when status changes to Approved/Rejected
    if (status && (status === 'Approved' || status === 'Rejected') && !approval.completedAt) {
      updateData.completedAt = new Date();
    }

    await approval.update(updateData);

    res.json(approval);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update purchase approval' });
  }
});

// DELETE /api/vendor/approvals/:id - delete (Admin only)
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const approval = await PurchaseApproval.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!approval) return res.status(404).json({ error: 'Purchase approval not found' });
    await approval.destroy();
    res.json({ message: 'Purchase approval deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete purchase approval' });
  }
});

// PUT /api/vendor/approvals/:id/approve - approve the request
router.put('/:id/approve', authenticateToken, requireRole(['Admin', 'Management']), async (req, res) => {
  try {
    const approval = await PurchaseApproval.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!approval) return res.status(404).json({ error: 'Purchase approval not found' });

    // Parse approvers list
    let approversList = [];
    if (approval.approvers) {
      approversList = typeof approval.approvers === 'string' ? JSON.parse(approval.approvers) : approval.approvers;
    }

    // Find if current user is the allowed approver for the current level (unless Admin)
    const currentLevelNum = parseInt(approval.currentLevel) || 1;
    const totalLevelsNum = parseInt(approval.totalLevels) || 1;
    const currentApprover = approversList.find(a => parseInt(a.level) === currentLevelNum);

    const requesterId = req.user.id;
    const isAdmin = req.user.role === 'Admin';

    if (currentApprover && parseInt(currentApprover.userId) !== requesterId && !isAdmin) {
      return res.status(403).json({ error: 'You are not the designated approver for the current level.' });
    }

    if (currentLevelNum < totalLevelsNum) {
      // Move to next level
      await approval.update({
        currentLevel: currentLevelNum + 1,
        status: 'Partially Approved'
      });
      // Referenced document remains in pending state
    } else {
      // Last level approved, mark whole request as Approved
      await approval.update({
        status: 'Approved',
        completedAt: new Date()
      });

      // Auto-update the status of the referenced document to 'Approved'
      const { module, referenceId } = approval;
      try {
        if (module === 'PurchaseRequisition') {
          await PurchaseRequisition.update({ status: 'Approved' }, { where: { id: referenceId, CompanyId: approval.CompanyId } });
        } else if (module === 'PurchaseOrder') {
          await PurchaseOrder.update({ status: 'Approved' }, { where: { id: referenceId, CompanyId: approval.CompanyId } });
        } else if (module === 'VendorBill') {
          await VendorBill.update({ status: 'Approved' }, { where: { id: referenceId, CompanyId: approval.CompanyId } });
        } else if (module === 'VendorPayment') {
          await VendorPayment.update({ status: 'Approved' }, { where: { id: referenceId, CompanyId: approval.CompanyId } });
        }
      } catch (dbErr) {
        console.error('Failed to auto-update source document status on approval:', dbErr);
      }
    }

    res.json(approval);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// PUT /api/vendor/approvals/:id/reject - reject the request
router.put('/:id/reject', authenticateToken, requireRole(['Admin', 'Management']), async (req, res) => {
  try {
    const approval = await PurchaseApproval.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!approval) return res.status(404).json({ error: 'Purchase approval not found' });

    await approval.update({
      status: 'Rejected',
      completedAt: new Date()
    });

    // Auto-update the status of the referenced document to 'Rejected'
    const { module, referenceId } = approval;
    try {
      if (module === 'PurchaseRequisition') {
        await PurchaseRequisition.update({ status: 'Rejected' }, { where: { id: referenceId, CompanyId: approval.CompanyId } });
      } else if (module === 'PurchaseOrder') {
        await PurchaseOrder.update({ status: 'Rejected' }, { where: { id: referenceId, CompanyId: approval.CompanyId } });
      } else if (module === 'VendorBill') {
        await VendorBill.update({ status: 'Rejected' }, { where: { id: referenceId, CompanyId: approval.CompanyId } });
      } else if (module === 'VendorPayment') {
        await VendorPayment.update({ status: 'Rejected' }, { where: { id: referenceId, CompanyId: approval.CompanyId } });
      }
    } catch (dbErr) {
      console.error('Failed to auto-update source document status on rejection:', dbErr);
    }

    res.json(approval);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

export default router;
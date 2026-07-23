import express from 'express';
import { Op } from 'sequelize';
import PurchaseRequisition from '../models/purchaseRequisition.js';
import User from '../models/user.js';
import Department from '../models/department.js';
import Warehouse from '../models/warehouse.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generateRequisitionCode } from '../models/purchaseRequisition.js';

const router = express.Router();

// GET /api/vendor/requisitions - list all with optional search
router.get('/', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const { search, status, priority, requestedById, departmentId, dateFrom, dateTo } = req.query;
    const whereClause = { CompanyId: req.user.CompanyId };

    if (search) {
      whereClause[Op.or] = [
        { requisitionNumber: { [Op.like]: `%${search}%` } },
        { '$RequestedBy.name$': { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (requestedById) whereClause.RequestedById = requestedById;
    if (departmentId) whereClause.DepartmentId = departmentId;
    if (dateFrom || dateTo) {
      whereClause.requisitionDate = {};
      if (dateFrom) whereClause.requisitionDate[Op.gte] = dateFrom;
      if (dateTo) whereClause.requisitionDate[Op.lte] = dateTo;
    }

    const requisitions = await PurchaseRequisition.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'RequestedBy', attributes: ['id', 'name'] },
        { model: Department, as: 'Department', attributes: ['id', 'name'] },
        { model: Warehouse, as: 'Warehouse', attributes: ['id', 'name', 'warehouseCode'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(requisitions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch purchase requisitions' });
  }
});

// GET /api/vendor/requisitions/:id - single requisition
router.get('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const requisition = await PurchaseRequisition.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [
        { model: User, as: 'RequestedBy', attributes: ['id', 'name'] },
        { model: Department, as: 'Department', attributes: ['id', 'name'] },
        { model: Warehouse, as: 'Warehouse', attributes: ['id', 'name', 'warehouseCode'] }
      ]
    });
    if (!requisition) return res.status(404).json({ error: 'Purchase requisition not found' });
    res.json(requisition);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch purchase requisition' });
  }
});

// POST /api/vendor/requisitions - create
router.post('/', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const {
      requisitionNumber, requisitionDate, RequestedById, DepartmentId, WarehouseId, requiredDate, priority,
      status, items, totalAmount, remarks, customFields
    } = req.body;

    if (!RequestedById) {
      return res.status(400).json({ error: 'Requested By is required.' });
    }

    let code = requisitionNumber;
    if (!code || code.trim() === '') {
      code = await generateRequisitionCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const newRequisition = await PurchaseRequisition.create({
      requisitionNumber: code,
      requisitionDate: requisitionDate || new Date(),
      RequestedById,
      DepartmentId: DepartmentId || null,
      WarehouseId: WarehouseId || null,
      requiredDate: requiredDate || null,
      priority: priority || 'Medium',
      status: status || 'Draft',
      items: items || [],
      totalAmount: totalAmount || 0,
      remarks: remarks?.trim(),
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });

    res.status(201).json(newRequisition);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create purchase requisition' });
  }
});

// PUT /api/vendor/requisitions/:id - update
router.put('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const requisition = await PurchaseRequisition.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!requisition) return res.status(404).json({ error: 'Purchase requisition not found' });

    const {
      requisitionDate, RequestedById, DepartmentId, WarehouseId, requiredDate, priority,
      status, items, totalAmount, remarks, customFields
    } = req.body;

    await requisition.update({
      requisitionDate: requisitionDate || requisition.requisitionDate,
      RequestedById: RequestedById || requisition.RequestedById,
      DepartmentId: DepartmentId !== undefined ? (DepartmentId || null) : requisition.DepartmentId,
      WarehouseId: WarehouseId !== undefined ? (WarehouseId || null) : requisition.WarehouseId,
      requiredDate: requiredDate || requisition.requiredDate,
      priority: priority || requisition.priority,
      status: status || requisition.status,
      items: items || requisition.items,
      totalAmount: totalAmount !== undefined ? totalAmount : requisition.totalAmount,
      remarks: remarks?.trim(),
      customFields: customFields !== undefined ? customFields : requisition.customFields
    });

    res.json(requisition);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update purchase requisition' });
  }
});

// DELETE /api/vendor/requisitions/:id - delete (Admin only)
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const requisition = await PurchaseRequisition.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!requisition) return res.status(404).json({ error: 'Purchase requisition not found' });
    await requisition.destroy();
    res.json({ message: 'Purchase requisition deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete purchase requisition' });
  }
});

export default router;
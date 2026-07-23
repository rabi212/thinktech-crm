import express from 'express';
import DispatchPlan from '../models/dispatchPlan.js';
import SalesOrder from '../models/salesOrder.js';
import Warehouse from '../models/warehouse.js';
import CustomerMaster from '../models/customerMaster.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper: generate next dispatch code
const generateDispatchPlanCode = async (companyId) => {
  const year = new Date().getFullYear();
  const count = await DispatchPlan.count({ 
    where: { CompanyId: companyId } 
  });
  const nextNum = String(count + 1).padStart(4, '0');
  return `DSP-${year}-${nextNum}`;
};

// GET /api/dispatch-planning — list all
router.get('/', authenticateToken, async (req, res) => {
  try {
    const plans = await DispatchPlan.findAll({
      where: { CompanyId: req.user.CompanyId },
      include: [
        { 
          model: SalesOrder, 
          as: 'SalesOrder', 
          attributes: ['id', 'soNumber'],
          include: [{ model: CustomerMaster, as: 'Customer', attributes: ['customerName'] }]
        },
        { model: Warehouse, as: 'Warehouse', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(plans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dispatch plans' });
  }
});

// GET /api/dispatch-planning/:id — single plan
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const plan = await DispatchPlan.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [
        { 
          model: SalesOrder, 
          as: 'SalesOrder',
          include: [{ model: CustomerMaster, as: 'Customer' }]
        },
        { model: Warehouse, as: 'Warehouse' }
      ]
    });
    if (!plan) return res.status(404).json({ error: 'Dispatch plan not found' });
    res.json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dispatch plan details' });
  }
});

// POST /api/dispatch-planning — schedule dispatch
router.post('/', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const { 
      dispatchNo, plannedDate, SalesOrderId, WarehouseId, items, status, remarks, customFields 
    } = req.body;

    let code = dispatchNo;
    if (!code || code.trim() === '' || code.trim() === 'Auto Generated') {
      code = await generateDispatchPlanCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const newPlan = await DispatchPlan.create({
      dispatchNo: code,
      plannedDate: plannedDate || new Date(),
      SalesOrderId,
      WarehouseId: WarehouseId || null,
      items: items || [],
      status: status || 'Scheduled',
      remarks: remarks || null,
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });

    res.status(201).json(newPlan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create dispatch plan' });
  }
});

// PUT /api/dispatch-planning/:id — update dispatch plan
router.put('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const plan = await DispatchPlan.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!plan) return res.status(404).json({ error: 'Dispatch plan not found' });

    const { 
      plannedDate, SalesOrderId, WarehouseId, items, status, remarks, customFields 
    } = req.body;

    const updateData = {
      plannedDate: plannedDate || plan.plannedDate,
      items: items || plan.items,
      status: status || plan.status,
      remarks: remarks || plan.remarks,
      customFields: customFields || plan.customFields
    };

    // Only update WarehouseId if it's explicitly provided and not empty
    if (WarehouseId !== undefined && WarehouseId) {
      updateData.WarehouseId = WarehouseId;
    } else if (WarehouseId === '') {
      // If explicitly set to empty, keep the current value
      updateData.WarehouseId = plan.WarehouseId;
    }

    // Only update SalesOrderId if it's explicitly provided and not empty
    if (SalesOrderId !== undefined && SalesOrderId) {
      updateData.SalesOrderId = SalesOrderId;
    }

    await plan.update(updateData);

    res.json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update dispatch plan: ' + error.message });
  }
});

// DELETE /api/dispatch-planning/:id — delete dispatch plan
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const plan = await DispatchPlan.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!plan) return res.status(404).json({ error: 'Dispatch plan not found' });

    await plan.destroy();
    res.json({ message: 'Dispatch plan deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete dispatch plan' });
  }
});

export default router;

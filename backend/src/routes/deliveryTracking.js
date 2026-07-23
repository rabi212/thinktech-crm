import express from 'express';
import DeliveryTracking from '../models/deliveryTracking.js';
import DispatchPlan from '../models/dispatchPlan.js';
import Vehicle from '../models/vehicle.js';
import SalesOrder from '../models/salesOrder.js';
import CustomerMaster from '../models/customerMaster.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper: generate next tracking code if none is provided
const generateTrackingCode = async (companyId) => {
  const count = await DeliveryTracking.count({ where: { CompanyId: companyId } });
  const nextNum = String(count + 1).padStart(4, '0');
  return `TRK-${nextNum}`;
};

// GET /api/delivery-tracking — list all
router.get('/', authenticateToken, async (req, res) => {
  try {
    const trackings = await DeliveryTracking.findAll({
      where: { CompanyId: req.user.CompanyId },
      include: [
        { 
          model: DispatchPlan, 
          as: 'DispatchPlan', 
          attributes: ['id', 'dispatchNo'],
          include: [{
            model: SalesOrder,
            as: 'SalesOrder',
            attributes: ['id', 'soNumber'],
            include: [{ model: CustomerMaster, as: 'Customer', attributes: ['customerName'] }]
          }]
        },
        { model: Vehicle, as: 'Vehicle', attributes: ['id', 'vehicleNumber', 'model'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(trackings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch delivery trackings' });
  }
});

// GET /api/delivery-tracking/:id — single tracking log
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const tracking = await DeliveryTracking.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [
        { 
          model: DispatchPlan, 
          as: 'DispatchPlan',
          include: [{
            model: SalesOrder,
            as: 'SalesOrder',
            include: [{ model: CustomerMaster, as: 'Customer' }]
          }]
        },
        { model: Vehicle, as: 'Vehicle' }
      ]
    });
    if (!tracking) return res.status(404).json({ error: 'Delivery tracking not found' });
    res.json(tracking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch delivery tracking details' });
  }
});

// POST /api/delivery-tracking — create delivery tracking log
router.post('/', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const { 
      trackingNo, courierPartner, shippedDate, deliveryStatus, 
      actualDeliveryDate, remarks, customFields, DispatchPlanId, VehicleId 
    } = req.body;

    let code = trackingNo;
    if (!code || code.trim() === '') {
      code = await generateTrackingCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const newTracking = await DeliveryTracking.create({
      trackingNo: code,
      courierPartner: courierPartner || null,
      shippedDate: shippedDate || new Date(),
      deliveryStatus: deliveryStatus || 'Pending',
      actualDeliveryDate: actualDeliveryDate || null,
      remarks: remarks || null,
      customFields: customFields || null,
      DispatchPlanId,
      VehicleId: VehicleId || null,
      CompanyId: req.user.CompanyId
    });

    res.status(201).json(newTracking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create delivery tracking' });
  }
});

// PUT /api/delivery-tracking/:id — update delivery tracking status
router.put('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const tracking = await DeliveryTracking.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!tracking) return res.status(404).json({ error: 'Delivery tracking not found' });

    const { 
      courierPartner, shippedDate, deliveryStatus, 
      actualDeliveryDate, remarks, customFields, VehicleId 
    } = req.body;

    const updateData = {
      courierPartner: courierPartner !== undefined ? courierPartner : tracking.courierPartner,
      shippedDate: shippedDate || tracking.shippedDate,
      deliveryStatus: deliveryStatus || tracking.deliveryStatus,
      actualDeliveryDate: actualDeliveryDate || tracking.actualDeliveryDate,
      remarks: remarks !== undefined ? remarks : tracking.remarks,
      customFields: customFields || tracking.customFields
    };

    // Only update VehicleId if it's provided and not empty
    if (VehicleId !== undefined && VehicleId !== '') {
      updateData.VehicleId = VehicleId;
    } else if (VehicleId === '') {
      // If explicitly set to empty string, preserve the current value
      updateData.VehicleId = tracking.VehicleId;
    } else {
      // If undefined, preserve the current value
      updateData.VehicleId = tracking.VehicleId;
    }

    await tracking.update(updateData);
    res.json(tracking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update delivery tracking' });
  }
});

// DELETE /api/delivery-tracking/:id — delete tracking log
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const tracking = await DeliveryTracking.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!tracking) return res.status(404).json({ error: 'Delivery tracking not found' });

    await tracking.destroy();
    res.json({ message: 'Delivery tracking deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete delivery tracking' });
  }
});

export default router;

import express from 'express';
import { Op } from 'sequelize';
import Location from '../models/location.js';
import Warehouse from '../models/warehouse.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper: generate next location code for a company
const generateLocationCode = async (companyId) => {
  const count = await Location.count({ where: { CompanyId: companyId } });
  const nextNum = String(count + 1).padStart(4, '0');
  return `LOC-${nextNum}`;
};

// GET /api/locations — list all with optional search
router.get('/', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management', 'AccountsUser', 'Employee']), async (req, res) => {
  try {
    const { search } = req.query;
    const whereClause = { CompanyId: req.user.CompanyId };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { locationCode: { [Op.like]: `%${search}%` } },
        { locationType: { [Op.like]: `%${search}%` } },
        { zone: { [Op.like]: `%${search}%` } },
        { aisle: { [Op.like]: `%${search}%` } },
        { rack: { [Op.like]: `%${search}%` } },
        { shelf: { [Op.like]: `%${search}%` } },
        { bin: { [Op.like]: `%${search}%` } }
      ];
    }

    const locations = await Location.findAll({
      where: whereClause,
      include: [
        { model: Warehouse, attributes: ['id', 'name', 'warehouseCode'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(locations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// GET /api/locations/:id — single location
router.get('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management', 'AccountsUser', 'Employee']), async (req, res) => {
  try {
    const location = await Location.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [
        { model: Warehouse, attributes: ['id', 'name', 'warehouseCode'] }
      ]
    });
    if (!location) return res.status(404).json({ error: 'Location not found' });
    res.json(location);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch location' });
  }
});

// POST /api/locations — create location
router.post('/', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const {
      name, locationCode, locationType, zone, aisle, rack, shelf, bin,
      capacity, capacityUnit, barcode, allowMixedItems, tempControlled, hazardousStorage,
      pickSequence, putawaySequence, status, remarks, WarehouseId, customFields
    } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Location Name is required' });
    }
    if (!locationType || locationType.trim() === '') {
      return res.status(400).json({ error: 'Location Type is required' });
    }
    if (!WarehouseId) {
      return res.status(400).json({ error: 'Warehouse is required' });
    }

    // Verify warehouse belongs to the same company
    const warehouse = await Warehouse.findOne({
      where: { id: WarehouseId, CompanyId: req.user.CompanyId }
    });
    if (!warehouse) {
      return res.status(400).json({ error: 'Invalid Warehouse' });
    }

    let code = locationCode;
    if (!code || code.trim() === '') {
      code = await generateLocationCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const newLocation = await Location.create({
      locationCode: code,
      name: name.trim(),
      locationType,
      zone: zone || null,
      aisle: aisle || null,
      rack: rack || null,
      shelf: shelf || null,
      bin: bin || null,
      capacity: capacity !== undefined && capacity !== '' ? Number(capacity) : null,
      capacityUnit: capacityUnit || null,
      barcode: barcode || null,
      allowMixedItems: !!allowMixedItems,
      tempControlled: !!tempControlled,
      hazardousStorage: !!hazardousStorage,
      pickSequence: pickSequence !== undefined && pickSequence !== '' ? Number(pickSequence) : null,
      putawaySequence: putawaySequence !== undefined && putawaySequence !== '' ? Number(putawaySequence) : null,
      status: status || 'Active',
      remarks: remarks || null,
      customFields: customFields || null,
      WarehouseId,
      CompanyId: req.user.CompanyId
    });

    const populated = await Location.findOne({
      where: { id: newLocation.id },
      include: [
        { model: Warehouse, attributes: ['id', 'name', 'warehouseCode'] }
      ]
    });

    res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

// PUT /api/locations/:id — update location
router.put('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const location = await Location.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!location) return res.status(404).json({ error: 'Location not found' });

    const {
      name, locationCode, locationType, zone, aisle, rack, shelf, bin,
      capacity, capacityUnit, barcode, allowMixedItems, tempControlled, hazardousStorage,
      pickSequence, putawaySequence, status, remarks, WarehouseId, customFields
    } = req.body;

    if (name !== undefined && name.trim() === '') {
      return res.status(400).json({ error: 'Location Name is required' });
    }
    if (locationType !== undefined && locationType.trim() === '') {
      return res.status(400).json({ error: 'Location Type is required' });
    }

    if (WarehouseId !== undefined) {
      if (!WarehouseId) {
        return res.status(400).json({ error: 'Warehouse is required' });
      }
      const warehouse = await Warehouse.findOne({
        where: { id: WarehouseId, CompanyId: req.user.CompanyId }
      });
      if (!warehouse) {
        return res.status(400).json({ error: 'Invalid Warehouse' });
      }
    }

    await location.update({
      locationCode: locationCode !== undefined ? (locationCode?.trim() || location.locationCode) : location.locationCode,
      name: name !== undefined ? name.trim() : location.name,
      locationType: locationType !== undefined ? locationType : location.locationType,
      zone: zone !== undefined ? zone : location.zone,
      aisle: aisle !== undefined ? aisle : location.aisle,
      rack: rack !== undefined ? rack : location.rack,
      shelf: shelf !== undefined ? shelf : location.shelf,
      bin: bin !== undefined ? bin : location.bin,
      capacity: capacity !== undefined ? (capacity !== '' ? Number(capacity) : null) : location.capacity,
      capacityUnit: capacityUnit !== undefined ? capacityUnit : location.capacityUnit,
      barcode: barcode !== undefined ? barcode : location.barcode,
      allowMixedItems: allowMixedItems !== undefined ? !!allowMixedItems : location.allowMixedItems,
      tempControlled: tempControlled !== undefined ? !!tempControlled : location.tempControlled,
      hazardousStorage: hazardousStorage !== undefined ? !!hazardousStorage : location.hazardousStorage,
      pickSequence: pickSequence !== undefined ? (pickSequence !== '' ? Number(pickSequence) : null) : location.pickSequence,
      putawaySequence: putawaySequence !== undefined ? (putawaySequence !== '' ? Number(putawaySequence) : null) : location.putawaySequence,
      status: status !== undefined ? status : location.status,
      remarks: remarks !== undefined ? remarks : location.remarks,
      customFields: customFields !== undefined ? customFields : location.customFields,
      WarehouseId: WarehouseId !== undefined ? WarehouseId : location.WarehouseId
    });

    const populated = await Location.findOne({
      where: { id: location.id },
      include: [
        { model: Warehouse, attributes: ['id', 'name', 'warehouseCode'] }
      ]
    });

    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// DELETE /api/locations/:id — delete location (Admin only)
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const location = await Location.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!location) return res.status(404).json({ error: 'Location not found' });
    await location.destroy();
    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

export default router;

import express from 'express';
import { Op } from 'sequelize';
import Warehouse from '../models/warehouse.js';
import Branch from '../models/branch.js';
import EmployeeMaster from '../models/employeeMaster.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper: generate next warehouse code for a company
const generateWarehouseCode = async (companyId) => {
  const count = await Warehouse.count({ where: { CompanyId: companyId } });
  const nextNum = String(count + 1).padStart(4, '0');
  return `WH-${nextNum}`;
};

// GET /api/warehouses — list all with optional search
router.get('/', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management', 'AccountsUser', 'Employee']), async (req, res) => {
  try {
    const { search } = req.query;
    const whereClause = { CompanyId: req.user.CompanyId };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { warehouseCode: { [Op.like]: `%${search}%` } },
        { warehouseType: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } },
        { state: { [Op.like]: `%${search}%` } },
        { country: { [Op.like]: `%${search}%` } },
        { contactPerson: { [Op.like]: `%${search}%` } }
      ];
    }

    const warehouses = await Warehouse.findAll({
      where: whereClause,
      include: [
        { model: Branch, attributes: ['id', 'name'] },
        { model: EmployeeMaster, as: 'Manager', attributes: ['id', 'employeeName'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(warehouses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch warehouses' });
  }
});

// GET /api/warehouses/:id — single warehouse
router.get('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management', 'AccountsUser', 'Employee']), async (req, res) => {
  try {
    const warehouse = await Warehouse.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [
        { model: Branch, attributes: ['id', 'name'] },
        { model: EmployeeMaster, as: 'Manager', attributes: ['id', 'employeeName'] }
      ]
    });
    if (!warehouse) return res.status(404).json({ error: 'Warehouse not found' });
    res.json(warehouse);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch warehouse' });
  }
});

// POST /api/warehouses — create warehouse
router.post('/', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const {
      name, warehouseCode, warehouseType, contactPerson, mobileNumber, email,
      country, state, city, pincode, addressLine1, addressLine2,
      latitude, longitude, storageCapacity, capacityUnit,
      defaultWarehouse, allowNegativeStock, status, notes,
      BranchId, ManagerId, customFields
    } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Warehouse Name is required' });
    }
    if (!warehouseType || warehouseType.trim() === '') {
      return res.status(400).json({ error: 'Warehouse Type is required' });
    }
    if (!BranchId) {
      return res.status(400).json({ error: 'Branch is required' });
    }
    if (!country || country.trim() === '') {
      return res.status(400).json({ error: 'Country is required' });
    }
    if (!state || state.trim() === '') {
      return res.status(400).json({ error: 'State is required' });
    }
    if (!city || city.trim() === '') {
      return res.status(400).json({ error: 'City is required' });
    }
    if (!addressLine1 || addressLine1.trim() === '') {
      return res.status(400).json({ error: 'Address Line 1 is required' });
    }

    let code = warehouseCode;
    if (!code || code.trim() === '') {
      code = await generateWarehouseCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    // If this is set as default, unset previous default warehouses
    if (defaultWarehouse) {
      await Warehouse.update({ defaultWarehouse: false }, { where: { CompanyId: req.user.CompanyId } });
    }

    const newWarehouse = await Warehouse.create({
      warehouseCode: code,
      name: name.trim(),
      warehouseType,
      contactPerson,
      mobileNumber,
      email: email || null,
      country,
      state,
      city,
      pincode,
      addressLine1,
      addressLine2,
      latitude: latitude || null,
      longitude: longitude || null,
      storageCapacity: storageCapacity || null,
      capacityUnit: capacityUnit || null,
      defaultWarehouse: !!defaultWarehouse,
      allowNegativeStock: !!allowNegativeStock,
      status: status || 'Active',
      notes,
      BranchId,
      ManagerId: ManagerId || null,
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });

    // Fetch the warehouse back with its associations populated
    const populated = await Warehouse.findOne({
      where: { id: newWarehouse.id },
      include: [
        { model: Branch, attributes: ['id', 'name'] },
        { model: EmployeeMaster, as: 'Manager', attributes: ['id', 'employeeName'] }
      ]
    });

    res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create warehouse' });
  }
});

// PUT /api/warehouses/:id — update warehouse
router.put('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const warehouse = await Warehouse.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!warehouse) return res.status(404).json({ error: 'Warehouse not found' });

    const {
      name, warehouseCode, warehouseType, contactPerson, mobileNumber, email,
      country, state, city, pincode, addressLine1, addressLine2,
      latitude, longitude, storageCapacity, capacityUnit,
      defaultWarehouse, allowNegativeStock, status, notes,
      BranchId, ManagerId, customFields
    } = req.body;

    if (name !== undefined && name.trim() === '') {
      return res.status(400).json({ error: 'Warehouse Name is required' });
    }
    if (warehouseType !== undefined && warehouseType.trim() === '') {
      return res.status(400).json({ error: 'Warehouse Type is required' });
    }
    if (BranchId !== undefined && !BranchId) {
      return res.status(400).json({ error: 'Branch is required' });
    }
    if (country !== undefined && country.trim() === '') {
      return res.status(400).json({ error: 'Country is required' });
    }
    if (state !== undefined && state.trim() === '') {
      return res.status(400).json({ error: 'State is required' });
    }
    if (city !== undefined && city.trim() === '') {
      return res.status(400).json({ error: 'City is required' });
    }
    if (addressLine1 !== undefined && addressLine1.trim() === '') {
      return res.status(400).json({ error: 'Address Line 1 is required' });
    }

    // If setting as default, unset others first
    if (defaultWarehouse) {
      await Warehouse.update({ defaultWarehouse: false }, { where: { CompanyId: req.user.CompanyId } });
    }

    await warehouse.update({
      warehouseCode: warehouseCode !== undefined ? (warehouseCode?.trim() || warehouse.warehouseCode) : warehouse.warehouseCode,
      name: name !== undefined ? name.trim() : warehouse.name,
      warehouseType: warehouseType !== undefined ? warehouseType : warehouse.warehouseType,
      contactPerson: contactPerson !== undefined ? contactPerson : warehouse.contactPerson,
      mobileNumber: mobileNumber !== undefined ? mobileNumber : warehouse.mobileNumber,
      email: email !== undefined ? (email || null) : warehouse.email,
      country: country !== undefined ? country : warehouse.country,
      state: state !== undefined ? state : warehouse.state,
      city: city !== undefined ? city : warehouse.city,
      pincode: pincode !== undefined ? pincode : warehouse.pincode,
      addressLine1: addressLine1 !== undefined ? addressLine1 : warehouse.addressLine1,
      addressLine2: addressLine2 !== undefined ? addressLine2 : warehouse.addressLine2,
      latitude: latitude !== undefined ? (latitude || null) : warehouse.latitude,
      longitude: longitude !== undefined ? (longitude || null) : warehouse.longitude,
      storageCapacity: storageCapacity !== undefined ? (storageCapacity || null) : warehouse.storageCapacity,
      capacityUnit: capacityUnit !== undefined ? (capacityUnit || null) : warehouse.capacityUnit,
      defaultWarehouse: defaultWarehouse !== undefined ? !!defaultWarehouse : warehouse.defaultWarehouse,
      allowNegativeStock: allowNegativeStock !== undefined ? !!allowNegativeStock : warehouse.allowNegativeStock,
      status: status !== undefined ? status : warehouse.status,
      notes: notes !== undefined ? notes : warehouse.notes,
      BranchId: BranchId !== undefined ? BranchId : warehouse.BranchId,
      ManagerId: ManagerId !== undefined ? (ManagerId || null) : warehouse.ManagerId,
      customFields: customFields !== undefined ? customFields : warehouse.customFields
    });

    const populated = await Warehouse.findOne({
      where: { id: warehouse.id },
      include: [
        { model: Branch, attributes: ['id', 'name'] },
        { model: EmployeeMaster, as: 'Manager', attributes: ['id', 'employeeName'] }
      ]
    });

    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update warehouse' });
  }
});

// DELETE /api/warehouses/:id — delete warehouse (Admin only)
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const warehouse = await Warehouse.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!warehouse) return res.status(404).json({ error: 'Warehouse not found' });
    await warehouse.destroy();
    res.json({ message: 'Warehouse deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete warehouse' });
  }
});

export default router;

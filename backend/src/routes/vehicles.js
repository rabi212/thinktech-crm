import express from 'express';
import { Op } from 'sequelize';
import Vehicle from '../models/vehicle.js';
import Company from '../models/company.js';
import Branch from '../models/branch.js';
import EmployeeMaster from '../models/employeeMaster.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

const generateVehicleCode = async (companyId) => {
  const count = await Vehicle.count({ where: { CompanyId: companyId } });
  const nextNum = String(count + 1).padStart(4, '0');
  return `VEH-${nextNum}`;
};

const includeClause = [
  { model: Company, attributes: ['id', 'name'] },
  { model: Branch, attributes: ['id', 'name'] },
  { model: EmployeeMaster, as: 'AssignedDriver', attributes: ['id', 'employeeName', 'employeeCode'] }
];

router.get('/', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management', 'AccountsUser', 'Employee']), async (req, res) => {
  try {
    const { search } = req.query;
    const whereClause = { CompanyId: req.user.CompanyId };

    if (search) {
      whereClause[Op.or] = [
        { vehicleCode: { [Op.like]: `%${search}%` } },
        { vehicleNumber: { [Op.like]: `%${search}%` } },
        { vehicleName: { [Op.like]: `%${search}%` } },
        { vehicleType: { [Op.like]: `%${search}%` } },
        { brand: { [Op.like]: `%${search}%` } },
        { model: { [Op.like]: `%${search}%` } },
        { fuelType: { [Op.like]: `%${search}%` } }
      ];
    }

    const vehicles = await Vehicle.findAll({
      where: whereClause,
      include: includeClause,
      order: [['createdAt', 'DESC']]
    });
    res.json(vehicles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

router.post('/', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const {
      vehicleCode, vehicleNumber, vehicleName, vehicleType, brand, model,
      fuelType, color, chassisNumber, engineNumber, manufacturingYear,
      BranchId, AssignedDriverId, status, remarks, customFields
    } = req.body;

    if (!vehicleNumber || vehicleNumber.trim() === '') {
      return res.status(400).json({ error: 'Vehicle Number is required' });
    }
    if (!vehicleType || vehicleType.trim() === '') {
      return res.status(400).json({ error: 'Vehicle Type is required' });
    }
    if (!fuelType || fuelType.trim() === '') {
      return res.status(400).json({ error: 'Fuel Type is required' });
    }

    let code = vehicleCode;
    if (!code || code.trim() === '') {
      code = await generateVehicleCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const duplicate = await Vehicle.findOne({
      where: {
        CompanyId: req.user.CompanyId,
        [Op.or]: [
          { vehicleCode: code },
          { vehicleNumber: vehicleNumber.trim() }
        ]
      }
    });
    if (duplicate) {
      return res.status(400).json({ error: 'Vehicle Code or Vehicle Number already exists' });
    }

    const vehicle = await Vehicle.create({
      vehicleCode: code,
      vehicleNumber: vehicleNumber.trim(),
      vehicleName: vehicleName || null,
      vehicleType,
      brand: brand || null,
      model: model || null,
      fuelType,
      color: color || null,
      chassisNumber: chassisNumber || null,
      engineNumber: engineNumber || null,
      manufacturingYear: manufacturingYear || null,
      BranchId: BranchId || null,
      AssignedDriverId: AssignedDriverId || null,
      status: status || 'Active',
      remarks: remarks || null,
      createdBy: req.user.email,
      updatedBy: null,
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });

    const populated = await Vehicle.findByPk(vehicle.id, { include: includeClause });
    res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
});

router.put('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const {
      vehicleCode, vehicleNumber, vehicleName, vehicleType, brand, model,
      fuelType, color, chassisNumber, engineNumber, manufacturingYear,
      BranchId, AssignedDriverId, status, remarks, customFields
    } = req.body;

    if (vehicleNumber !== undefined && vehicleNumber.trim() === '') {
      return res.status(400).json({ error: 'Vehicle Number is required' });
    }
    if (vehicleType !== undefined && vehicleType.trim() === '') {
      return res.status(400).json({ error: 'Vehicle Type is required' });
    }
    if (fuelType !== undefined && fuelType.trim() === '') {
      return res.status(400).json({ error: 'Fuel Type is required' });
    }

    const nextVehicleCode = vehicleCode !== undefined ? (vehicleCode?.trim() || vehicle.vehicleCode) : vehicle.vehicleCode;
    const nextVehicleNumber = vehicleNumber !== undefined ? vehicleNumber.trim() : vehicle.vehicleNumber;
    const duplicate = await Vehicle.findOne({
      where: {
        CompanyId: req.user.CompanyId,
        id: { [Op.ne]: vehicle.id },
        [Op.or]: [
          { vehicleCode: nextVehicleCode },
          { vehicleNumber: nextVehicleNumber }
        ]
      }
    });
    if (duplicate) {
      return res.status(400).json({ error: 'Vehicle Code or Vehicle Number already exists' });
    }

    await vehicle.update({
      vehicleCode: nextVehicleCode,
      vehicleNumber: nextVehicleNumber,
      vehicleName: vehicleName !== undefined ? vehicleName : vehicle.vehicleName,
      vehicleType: vehicleType !== undefined ? vehicleType : vehicle.vehicleType,
      brand: brand !== undefined ? brand : vehicle.brand,
      model: model !== undefined ? model : vehicle.model,
      fuelType: fuelType !== undefined ? fuelType : vehicle.fuelType,
      color: color !== undefined ? color : vehicle.color,
      chassisNumber: chassisNumber !== undefined ? chassisNumber : vehicle.chassisNumber,
      engineNumber: engineNumber !== undefined ? engineNumber : vehicle.engineNumber,
      manufacturingYear: manufacturingYear !== undefined ? (manufacturingYear || null) : vehicle.manufacturingYear,
      BranchId: BranchId !== undefined ? (BranchId || null) : vehicle.BranchId,
      AssignedDriverId: AssignedDriverId !== undefined ? (AssignedDriverId || null) : vehicle.AssignedDriverId,
      status: status !== undefined ? status : vehicle.status,
      remarks: remarks !== undefined ? remarks : vehicle.remarks,
      updatedBy: req.user.email,
      customFields: customFields !== undefined ? customFields : vehicle.customFields
    });

    const populated = await Vehicle.findByPk(vehicle.id, { include: includeClause });
    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    await vehicle.destroy();
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

export default router;

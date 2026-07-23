import express from 'express';
import { Op } from 'sequelize';
import Asset from '../models/asset.js';
import Company from '../models/company.js';
import Branch from '../models/branch.js';
import Department from '../models/department.js';
import EmployeeMaster from '../models/employeeMaster.js';
import Vendor from '../models/vendor.js';
import Location from '../models/location.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

const generateAssetCode = async (companyId) => {
  const count = await Asset.count({ where: { CompanyId: companyId } });
  const nextNum = String(count + 1).padStart(4, '0');
  return `AST-${nextNum}`;
};

const includeClause = [
  { model: Company, attributes: ['id', 'name'] },
  { model: Branch, attributes: ['id', 'name'] },
  { model: Department, attributes: ['id', 'name'] },
  { model: EmployeeMaster, as: 'AssignedEmployee', attributes: ['id', 'employeeName', 'employeeCode'] },
  { model: Vendor, attributes: ['id', 'vendorName', 'vendorCode'] },
  { model: Location, attributes: ['id', 'name', 'locationCode'] }
];

router.get('/', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management', 'AccountsUser', 'Employee']), async (req, res) => {
  try {
    const { search } = req.query;
    const whereClause = { CompanyId: req.user.CompanyId };

    if (search) {
      whereClause[Op.or] = [
        { assetCode: { [Op.like]: `%${search}%` } },
        { assetName: { [Op.like]: `%${search}%` } },
        { assetCategory: { [Op.like]: `%${search}%` } },
        { brand: { [Op.like]: `%${search}%` } },
        { model: { [Op.like]: `%${search}%` } },
        { serialNumber: { [Op.like]: `%${search}%` } }
      ];
    }

    const assets = await Asset.findAll({
      where: whereClause,
      include: includeClause,
      order: [['createdAt', 'DESC']]
    });
    res.json(assets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

router.post('/', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const {
      assetCode, assetName, assetCategory, brand, model, serialNumber,
      BranchId, DepartmentId, AssignedEmployeeId, purchaseDate, purchaseCost,
      VendorId, warrantyExpiry, LocationId, assetStatus, description, customFields
    } = req.body;

    if (!assetName || assetName.trim() === '') {
      return res.status(400).json({ error: 'Asset Name is required' });
    }
    if (!assetCategory || assetCategory.trim() === '') {
      return res.status(400).json({ error: 'Asset Category is required' });
    }
    if (!assetStatus || assetStatus.trim() === '') {
      return res.status(400).json({ error: 'Asset Status is required' });
    }

    let code = assetCode;
    if (!code || code.trim() === '') {
      code = await generateAssetCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const duplicate = await Asset.findOne({
      where: {
        CompanyId: req.user.CompanyId,
        assetCode: code
      }
    });
    if (duplicate) {
      return res.status(400).json({ error: 'Asset Code already exists' });
    }

    const asset = await Asset.create({
      assetCode: code,
      assetName: assetName.trim(),
      assetCategory: assetCategory.trim(),
      brand: brand || null,
      model: model || null,
      serialNumber: serialNumber || null,
      BranchId: BranchId || null,
      DepartmentId: DepartmentId || null,
      AssignedEmployeeId: AssignedEmployeeId || null,
      purchaseDate: purchaseDate || null,
      purchaseCost: purchaseCost !== undefined && purchaseCost !== '' ? purchaseCost : null,
      VendorId: VendorId || null,
      warrantyExpiry: warrantyExpiry || null,
      LocationId: LocationId || null,
      assetStatus: assetStatus || 'Active',
      description: description || null,
      createdBy: req.user.email,
      updatedBy: null,
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });

    const populated = await Asset.findByPk(asset.id, { include: includeClause });
    res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

router.put('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const asset = await Asset.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const {
      assetCode, assetName, assetCategory, brand, model, serialNumber,
      BranchId, DepartmentId, AssignedEmployeeId, purchaseDate, purchaseCost,
      VendorId, warrantyExpiry, LocationId, assetStatus, description, customFields
    } = req.body;

    if (assetName !== undefined && assetName.trim() === '') {
      return res.status(400).json({ error: 'Asset Name is required' });
    }
    if (assetCategory !== undefined && assetCategory.trim() === '') {
      return res.status(400).json({ error: 'Asset Category is required' });
    }
    if (assetStatus !== undefined && assetStatus.trim() === '') {
      return res.status(400).json({ error: 'Asset Status is required' });
    }

    const nextAssetCode = assetCode !== undefined ? (assetCode?.trim() || asset.assetCode) : asset.assetCode;
    const duplicate = await Asset.findOne({
      where: {
        CompanyId: req.user.CompanyId,
        id: { [Op.ne]: asset.id },
        assetCode: nextAssetCode
      }
    });
    if (duplicate) {
      return res.status(400).json({ error: 'Asset Code already exists' });
    }

    await asset.update({
      assetCode: nextAssetCode,
      assetName: assetName !== undefined ? assetName.trim() : asset.assetName,
      assetCategory: assetCategory !== undefined ? assetCategory.trim() : asset.assetCategory,
      brand: brand !== undefined ? brand : asset.brand,
      model: model !== undefined ? model : asset.model,
      serialNumber: serialNumber !== undefined ? serialNumber : asset.serialNumber,
      BranchId: BranchId !== undefined ? (BranchId || null) : asset.BranchId,
      DepartmentId: DepartmentId !== undefined ? (DepartmentId || null) : asset.DepartmentId,
      AssignedEmployeeId: AssignedEmployeeId !== undefined ? (AssignedEmployeeId || null) : asset.AssignedEmployeeId,
      purchaseDate: purchaseDate !== undefined ? (purchaseDate || null) : asset.purchaseDate,
      purchaseCost: purchaseCost !== undefined ? (purchaseCost !== '' ? purchaseCost : null) : asset.purchaseCost,
      VendorId: VendorId !== undefined ? (VendorId || null) : asset.VendorId,
      warrantyExpiry: warrantyExpiry !== undefined ? (warrantyExpiry || null) : asset.warrantyExpiry,
      LocationId: LocationId !== undefined ? (LocationId || null) : asset.LocationId,
      assetStatus: assetStatus !== undefined ? assetStatus : asset.assetStatus,
      description: description !== undefined ? description : asset.description,
      updatedBy: req.user.email,
      customFields: customFields !== undefined ? customFields : asset.customFields
    });

    const populated = await Asset.findByPk(asset.id, { include: includeClause });
    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const asset = await Asset.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    await asset.destroy();
    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

export default router;

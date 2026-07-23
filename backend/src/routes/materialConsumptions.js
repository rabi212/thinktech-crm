import express from 'express';
import sequelize from '../config/db.js';
import MaterialConsumption, { generateConsumptionCode } from '../models/materialConsumption.js';
import Stock from '../models/stock.js';
import StockMovement from '../models/stockMovement.js';
import Item from '../models/item.js';
import Warehouse from '../models/warehouse.js';
import ProjectMaster from '../models/projectMaster.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/inventory/consumptions - List consumptions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const consumptions = await MaterialConsumption.findAll({
      where: { CompanyId: req.user.CompanyId },
      include: [
        { model: Warehouse, attributes: ['id', 'warehouseCode', 'name'] },
        { model: ProjectMaster, as: 'Project', attributes: ['id', 'projectCode', 'projectName'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(consumptions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching material consumptions.' });
  }
});

// POST /api/inventory/consumptions - Log a new consumption
router.post('/', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { WarehouseId, ProjectId, consumptionDate, items, remarks } = req.body;

    if (!WarehouseId || !items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Warehouse and items list are required.' });
    }

    const warehouse = await Warehouse.findByPk(WarehouseId, { transaction });
    if (!warehouse || warehouse.CompanyId !== req.user.CompanyId) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Warehouse not found.' });
    }

    if (ProjectId) {
      const project = await ProjectMaster.findByPk(ProjectId, { transaction });
      if (!project || project.CompanyId !== req.user.CompanyId) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Project not found.' });
      }
    }

    const consumptionNumber = await generateConsumptionCode(req.user.CompanyId);

    // Deduct stock for each item
    for (const itemObj of items) {
      const { ItemId, quantity, batchNumber, lotNumber, serialNumber } = itemObj;

      const dbItem = await Item.findByPk(ItemId, { transaction });
      if (!dbItem) {
        await transaction.rollback();
        return res.status(404).json({ error: `Item ID ${ItemId} not found.` });
      }

      const stockQuery = {
        ItemId,
        WarehouseId,
        CompanyId: req.user.CompanyId
      };
      if (dbItem.trackingType === 'Batch' && batchNumber) stockQuery.batchNumber = batchNumber;
      if (dbItem.trackingType === 'Lot' && lotNumber) stockQuery.lotNumber = lotNumber;
      if (dbItem.trackingType === 'Serial' && serialNumber) stockQuery.serialNumber = serialNumber;

      const stock = await Stock.findOne({ where: stockQuery, transaction });
      const availQty = stock ? parseFloat(stock.quantity) : 0;
      if (availQty < parseFloat(quantity)) {
        await transaction.rollback();
        return res.status(400).json({
          error: `Insufficient Stock. Available Quantity: ${availQty}. Requested Consumption: ${quantity}.`
        });
      }

      // Deduct from stock
      stock.quantity = parseFloat(stock.quantity) - parseFloat(quantity);
      await stock.save({ transaction });

      // Create Stock Movement log
      await StockMovement.create({
        movementType: 'Consumption',
        referenceId: consumptionNumber,
        ItemId,
        fromWarehouseId: WarehouseId,
        quantity: parseFloat(quantity),
        batchNumber: dbItem.trackingType === 'Batch' ? batchNumber : null,
        lotNumber: dbItem.trackingType === 'Lot' ? lotNumber : null,
        serialNumber: dbItem.trackingType === 'Serial' ? serialNumber : null,
        movementDate: new Date(),
        CreatedByUserId: req.user.id,
        CompanyId: req.user.CompanyId
      }, { transaction });
    }

    const consumption = await MaterialConsumption.create({
      consumptionNumber,
      consumptionDate: consumptionDate || new Date(),
      WarehouseId,
      ProjectId: ProjectId || null,
      items,
      remarks: remarks || '',
      CompanyId: req.user.CompanyId
    }, { transaction });

    await transaction.commit();
    res.status(201).json(consumption);
  } catch (err) {
    await transaction.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error logging material consumption.' });
  }
});

// DELETE /api/inventory/consumptions/:id - Delete a material consumption
router.delete('/:id', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const consumption = await MaterialConsumption.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      transaction
    });

    if (!consumption) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Material consumption not found.' });
    }

    const itemsList = typeof consumption.items === 'string' ? JSON.parse(consumption.items) : consumption.items;

    for (const itemObj of itemsList) {
      const { ItemId, quantity, batchNumber, lotNumber, serialNumber } = itemObj;

      const dbItem = await Item.findByPk(ItemId, { transaction });
      if (dbItem) {
        // Revert: Add back to Warehouse
        const stockQuery = {
          ItemId,
          WarehouseId: consumption.WarehouseId,
          CompanyId: req.user.CompanyId
        };
        if (dbItem.trackingType === 'Batch' && batchNumber) stockQuery.batchNumber = batchNumber;
        if (dbItem.trackingType === 'Lot' && lotNumber) stockQuery.lotNumber = lotNumber;
        if (dbItem.trackingType === 'Serial' && serialNumber) stockQuery.serialNumber = serialNumber;

        let stock = await Stock.findOne({ where: stockQuery, transaction });
        if (stock) {
          stock.quantity = parseFloat(stock.quantity) + parseFloat(quantity);
          await stock.save({ transaction });
        } else {
          await Stock.create({
            ...stockQuery,
            quantity: parseFloat(quantity)
          }, { transaction });
        }
      }
    }

    // Delete stock movement records
    await StockMovement.destroy({
      where: { referenceId: consumption.consumptionNumber, CompanyId: req.user.CompanyId },
      transaction
    });

    await consumption.destroy({ transaction });
    await transaction.commit();
    res.json({ message: 'Material consumption deleted successfully.' });
  } catch (err) {
    await transaction.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error deleting material consumption.' });
  }
});

export default router;

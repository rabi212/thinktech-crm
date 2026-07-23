import express from 'express';
import sequelize from '../config/db.js';
import Stock from '../models/stock.js';
import StockMovement from '../models/stockMovement.js';
import Item from '../models/item.js';
import Warehouse from '../models/warehouse.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const generateInwardCode = async (CompanyId) => {
  const count = await StockMovement.count({
    where: { CompanyId, movementType: 'Inward' }
  });
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  return `INW-${dateStr}-${String(count + 1).padStart(4, '0')}`;
};

const generateOutwardCode = async (CompanyId) => {
  const count = await StockMovement.count({
    where: { CompanyId, movementType: 'Outward' }
  });
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  return `OUT-${dateStr}-${String(count + 1).padStart(4, '0')}`;
};

// GET /api/inventory/stocks - Get current stock levels
router.get('/stocks', authenticateToken, async (req, res) => {
  try {
    const { WarehouseId, ItemId } = req.query;
    const whereClause = { 
      CompanyId: req.user.CompanyId,
      quantity: { [sequelize.Sequelize.Op.gt]: 0 }
    };
    
    if (WarehouseId) whereClause.WarehouseId = WarehouseId;
    if (ItemId) whereClause.ItemId = ItemId;

    const stocks = await Stock.findAll({
      where: whereClause,
      include: [
        { model: Item, attributes: ['id', 'itemCode', 'name', 'unit', 'trackingType'] },
        { model: Warehouse, attributes: ['id', 'warehouseCode', 'name'] }
      ],
      order: [['updatedAt', 'DESC']]
    });

    res.json(stocks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching stocks.' });
  }
});

// GET /api/inventory/movements - Get stock movement log
router.get('/movements', authenticateToken, async (req, res) => {
  try {
    const { WarehouseId, ItemId, movementType } = req.query;
    const whereClause = { CompanyId: req.user.CompanyId };

    if (ItemId) whereClause.ItemId = ItemId;
    if (movementType) whereClause.movementType = movementType;
    if (WarehouseId) {
      whereClause[sequelize.Sequelize.Op.or] = [
        { fromWarehouseId: WarehouseId },
        { toWarehouseId: WarehouseId }
      ];
    }

    const movements = await StockMovement.findAll({
      where: whereClause,
      include: [
        { model: Item, attributes: ['id', 'itemCode', 'name', 'unit'] },
        { model: Warehouse, as: 'FromWarehouse', attributes: ['id', 'warehouseCode', 'name'] },
        { model: Warehouse, as: 'ToWarehouse', attributes: ['id', 'warehouseCode', 'name'] }
      ],
      order: [['movementDate', 'DESC']]
    });

    res.json(movements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching stock movements.' });
  }
});

// POST /api/inventory/inward - Manual Stock Inward
router.post('/inward', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { ItemId, WarehouseId, quantity, batchNumber, lotNumber, serialNumber, expiryDate, referenceId, movementNumber } = req.body;
    
    if (!ItemId || !WarehouseId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Item, Warehouse and positive Quantity are required.' });
    }

    const item = await Item.findByPk(ItemId);
    if (!item || item.CompanyId !== req.user.CompanyId) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    const warehouse = await Warehouse.findByPk(WarehouseId);
    if (!warehouse || warehouse.CompanyId !== req.user.CompanyId) {
      return res.status(404).json({ error: 'Warehouse not found.' });
    }

    // Determine uniqueness of stock record based on trackingType
    const stockQuery = {
      ItemId,
      WarehouseId,
      CompanyId: req.user.CompanyId
    };

    if (item.trackingType === 'Batch' && batchNumber) stockQuery.batchNumber = batchNumber;
    if (item.trackingType === 'Lot' && lotNumber) stockQuery.lotNumber = lotNumber;
    if (item.trackingType === 'Serial' && serialNumber) stockQuery.serialNumber = serialNumber;

    // Find or create Stock record
    let stock = await Stock.findOne({ where: stockQuery, transaction });
    if (!stock) {
      stock = await Stock.create({
        ...stockQuery,
        quantity: parseFloat(quantity),
        expiryDate: item.hasExpiry ? expiryDate : null
      }, { transaction });
    } else {
      stock.quantity = parseFloat(stock.quantity) + parseFloat(quantity);
      await stock.save({ transaction });
    }

    const numberToSave = movementNumber && movementNumber.trim() !== '' ? movementNumber.trim() : await generateInwardCode(req.user.CompanyId);

    // Create Stock Movement log
    const movement = await StockMovement.create({
      movementType: 'Inward',
      movementNumber: numberToSave,
      referenceId: referenceId || 'Manual Inward',
      ItemId,
      toWarehouseId: WarehouseId,
      quantity: parseFloat(quantity),
      batchNumber: item.trackingType === 'Batch' ? batchNumber : null,
      lotNumber: item.trackingType === 'Lot' ? lotNumber : null,
      serialNumber: item.trackingType === 'Serial' ? serialNumber : null,
      movementDate: new Date(),
      CreatedByUserId: req.user.id,
      CompanyId: req.user.CompanyId
    }, { transaction });

    await transaction.commit();
    res.status(201).json({ stock, movement });
  } catch (err) {
    await transaction.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error performing stock inward.' });
  }
});

// POST /api/inventory/outward - Manual Stock Outward
router.post('/outward', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { ItemId, WarehouseId, quantity, batchNumber, lotNumber, serialNumber, referenceId, movementNumber } = req.body;

    if (!ItemId || !WarehouseId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Item, Warehouse and positive Quantity are required.' });
    }

    const item = await Item.findByPk(ItemId);
    if (!item || item.CompanyId !== req.user.CompanyId) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    const warehouse = await Warehouse.findByPk(WarehouseId);
    if (!warehouse || warehouse.CompanyId !== req.user.CompanyId) {
      return res.status(404).json({ error: 'Warehouse not found.' });
    }

    // Determine uniqueness of stock record based on trackingType
    const stockQuery = {
      ItemId,
      WarehouseId,
      CompanyId: req.user.CompanyId
    };

    if (item.trackingType === 'Batch' && batchNumber) stockQuery.batchNumber = batchNumber;
    if (item.trackingType === 'Lot' && lotNumber) stockQuery.lotNumber = lotNumber;
    if (item.trackingType === 'Serial' && serialNumber) stockQuery.serialNumber = serialNumber;

    const stock = await Stock.findOne({ where: stockQuery, transaction });
    const availQty = stock ? parseFloat(stock.quantity) : 0;
    if (availQty < parseFloat(quantity)) {
      return res.status(400).json({ error: `Insufficient Stock. Available Quantity: ${availQty}. Requested Outward: ${quantity}.` });
    }

    stock.quantity = parseFloat(stock.quantity) - parseFloat(quantity);
    await stock.save({ transaction });

    const numberToSave = movementNumber && movementNumber.trim() !== '' ? movementNumber.trim() : await generateOutwardCode(req.user.CompanyId);

    // Create Stock Movement log
    const movement = await StockMovement.create({
      movementType: 'Outward',
      movementNumber: numberToSave,
      referenceId: referenceId || 'Manual Outward',
      ItemId,
      fromWarehouseId: WarehouseId,
      quantity: parseFloat(quantity),
      batchNumber: item.trackingType === 'Batch' ? batchNumber : null,
      lotNumber: item.trackingType === 'Lot' ? lotNumber : null,
      serialNumber: item.trackingType === 'Serial' ? serialNumber : null,
      movementDate: new Date(),
      CreatedByUserId: req.user.id,
      CompanyId: req.user.CompanyId
    }, { transaction });

    await transaction.commit();
    res.status(201).json({ stock, movement });
  } catch (err) {
    await transaction.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error performing stock outward.' });
  }
});

// PUT /api/inventory/movements/:id - Edit Inward/Outward movements
router.put('/movements/:id', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { ItemId, WarehouseId, quantity, batchNumber, lotNumber, serialNumber, expiryDate, referenceId, movementNumber } = req.body;

    const movement = await StockMovement.findOne({
      where: { id, CompanyId: req.user.CompanyId }
    });

    if (!movement) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Movement not found.' });
    }

    if (movement.movementType === 'Inward') {
      // 1. Revert old stock
      const oldStockQuery = {
        ItemId: movement.ItemId,
        WarehouseId: movement.toWarehouseId,
        CompanyId: req.user.CompanyId
      };
      if (movement.batchNumber) oldStockQuery.batchNumber = movement.batchNumber;
      if (movement.lotNumber) oldStockQuery.lotNumber = movement.lotNumber;
      if (movement.serialNumber) oldStockQuery.serialNumber = movement.serialNumber;

      const oldStock = await Stock.findOne({ where: oldStockQuery, transaction });
      if (oldStock) {
        oldStock.quantity = parseFloat(oldStock.quantity) - parseFloat(movement.quantity);
        await oldStock.save({ transaction });
      }

      // 2. Validate new warehouse/item
      const item = await Item.findByPk(ItemId);
      if (!item || item.CompanyId !== req.user.CompanyId) {
        await transaction.rollback();
        return res.status(404).json({ error: 'New Item not found.' });
      }
      const warehouse = await Warehouse.findByPk(WarehouseId);
      if (!warehouse || warehouse.CompanyId !== req.user.CompanyId) {
        await transaction.rollback();
        return res.status(404).json({ error: 'New Warehouse not found.' });
      }

      // 3. Apply new stock
      const newStockQuery = {
        ItemId,
        WarehouseId,
        CompanyId: req.user.CompanyId
      };
      if (item.trackingType === 'Batch' && batchNumber) newStockQuery.batchNumber = batchNumber;
      if (item.trackingType === 'Lot' && lotNumber) newStockQuery.lotNumber = lotNumber;
      if (item.trackingType === 'Serial' && serialNumber) newStockQuery.serialNumber = serialNumber;

      let newStock = await Stock.findOne({ where: newStockQuery, transaction });
      if (!newStock) {
        newStock = await Stock.create({
          ...newStockQuery,
          quantity: parseFloat(quantity),
          expiryDate: item.hasExpiry ? expiryDate : null
        }, { transaction });
      } else {
        newStock.quantity = parseFloat(newStock.quantity) + parseFloat(quantity);
        if (item.hasExpiry && expiryDate) {
          newStock.expiryDate = expiryDate;
        }
        await newStock.save({ transaction });
      }

      // 4. Update movement log
      await movement.update({
        ItemId,
        toWarehouseId: WarehouseId,
        quantity: parseFloat(quantity),
        batchNumber: item.trackingType === 'Batch' ? batchNumber : null,
        lotNumber: item.trackingType === 'Lot' ? lotNumber : null,
        serialNumber: item.trackingType === 'Serial' ? serialNumber : null,
        referenceId: referenceId || movement.referenceId,
        movementNumber: movementNumber || movement.movementNumber
      }, { transaction });

    } else if (movement.movementType === 'Outward') {
      // 1. Revert old stock (add it back to fromWarehouseId)
      const oldStockQuery = {
        ItemId: movement.ItemId,
        WarehouseId: movement.fromWarehouseId,
        CompanyId: req.user.CompanyId
      };
      if (movement.batchNumber) oldStockQuery.batchNumber = movement.batchNumber;
      if (movement.lotNumber) oldStockQuery.lotNumber = movement.lotNumber;
      if (movement.serialNumber) oldStockQuery.serialNumber = movement.serialNumber;

      let oldStock = await Stock.findOne({ where: oldStockQuery, transaction });
      if (oldStock) {
        oldStock.quantity = parseFloat(oldStock.quantity) + parseFloat(movement.quantity);
        await oldStock.save({ transaction });
      }

      // 2. Validate new warehouse/item
      const item = await Item.findByPk(ItemId);
      if (!item || item.CompanyId !== req.user.CompanyId) {
        await transaction.rollback();
        return res.status(404).json({ error: 'New Item not found.' });
      }
      const warehouse = await Warehouse.findByPk(WarehouseId);
      if (!warehouse || warehouse.CompanyId !== req.user.CompanyId) {
        await transaction.rollback();
        return res.status(404).json({ error: 'New Warehouse not found.' });
      }

      // 3. Apply new stock (subtract from new warehouse)
      const newStockQuery = {
        ItemId,
        WarehouseId,
        CompanyId: req.user.CompanyId
      };
      if (item.trackingType === 'Batch' && batchNumber) newStockQuery.batchNumber = batchNumber;
      if (item.trackingType === 'Lot' && lotNumber) newStockQuery.lotNumber = lotNumber;
      if (item.trackingType === 'Serial' && serialNumber) newStockQuery.serialNumber = serialNumber;

      const newStock = await Stock.findOne({ where: newStockQuery, transaction });
      const availQty = newStock ? parseFloat(newStock.quantity) : 0;
      if (availQty < parseFloat(quantity)) {
        await transaction.rollback();
        return res.status(400).json({ error: `Insufficient Stock. Available Quantity: ${availQty}. Requested Outward: ${quantity}.` });
      }

      newStock.quantity = parseFloat(newStock.quantity) - parseFloat(quantity);
      await newStock.save({ transaction });

      // 4. Update movement log
      await movement.update({
        ItemId,
        fromWarehouseId: WarehouseId,
        quantity: parseFloat(quantity),
        batchNumber: item.trackingType === 'Batch' ? batchNumber : null,
        lotNumber: item.trackingType === 'Lot' ? lotNumber : null,
        serialNumber: item.trackingType === 'Serial' ? serialNumber : null,
        referenceId: referenceId || movement.referenceId,
        movementNumber: movementNumber || movement.movementNumber
      }, { transaction });
    } else {
      await transaction.rollback();
      return res.status(400).json({ error: 'Edit not supported directly for transfers/consumptions here.' });
    }

    await transaction.commit();
    res.json({ message: 'Movement updated successfully.' });
  } catch (err) {
    await transaction.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error updating movement.' });
  }
});

// DELETE /api/inventory/movements/:id - Delete Inward/Outward movements
router.delete('/movements/:id', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const movement = await StockMovement.findOne({
      where: { id, CompanyId: req.user.CompanyId }
    });

    if (!movement) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Movement not found.' });
    }

    if (movement.movementType === 'Inward') {
      // Find the corresponding stock record
      const stockQuery = {
        ItemId: movement.ItemId,
        WarehouseId: movement.toWarehouseId,
        CompanyId: req.user.CompanyId
      };
      if (movement.batchNumber) stockQuery.batchNumber = movement.batchNumber;
      if (movement.lotNumber) stockQuery.lotNumber = movement.lotNumber;
      if (movement.serialNumber) stockQuery.serialNumber = movement.serialNumber;

      const stock = await Stock.findOne({ where: stockQuery, transaction });
      if (!stock) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Stock record not found to revert.' });
      }

      const newQty = parseFloat(stock.quantity) - parseFloat(movement.quantity);
      if (newQty < 0) {
        // Fetch warehouse to check if negative stock is allowed
        const warehouse = await Warehouse.findByPk(movement.toWarehouseId);
        if (!warehouse || !warehouse.allowNegativeStock) {
          await transaction.rollback();
          return res.status(400).json({ error: 'Cannot delete inward: would result in negative stock levels.' });
        }
      }

      stock.quantity = newQty;
      await stock.save({ transaction });
      
    } else if (movement.movementType === 'Outward') {
      // Find or create the corresponding stock record
      const stockQuery = {
        ItemId: movement.ItemId,
        WarehouseId: movement.fromWarehouseId,
        CompanyId: req.user.CompanyId
      };
      if (movement.batchNumber) stockQuery.batchNumber = movement.batchNumber;
      if (movement.lotNumber) stockQuery.lotNumber = movement.lotNumber;
      if (movement.serialNumber) stockQuery.serialNumber = movement.serialNumber;

      let stock = await Stock.findOne({ where: stockQuery, transaction });
      if (!stock) {
        stock = await Stock.create({
          ...stockQuery,
          quantity: parseFloat(movement.quantity)
        }, { transaction });
      } else {
        stock.quantity = parseFloat(stock.quantity) + parseFloat(movement.quantity);
        await stock.save({ transaction });
      }
    } else {
      await transaction.rollback();
      return res.status(400).json({ error: 'Deletion not supported directly for transfers/consumptions here.' });
    }

    await movement.destroy({ transaction });
    await transaction.commit();
    res.json({ message: 'Movement deleted successfully.' });
  } catch (err) {
    await transaction.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error deleting movement.' });
  }
});

export default router;

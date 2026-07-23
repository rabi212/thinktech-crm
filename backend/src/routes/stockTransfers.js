import express from 'express';
import sequelize from '../config/db.js';
import StockTransfer, { generateTransferCode } from '../models/stockTransfer.js';
import Stock from '../models/stock.js';
import StockMovement from '../models/stockMovement.js';
import Item from '../models/item.js';
import Warehouse from '../models/warehouse.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/inventory/transfers - List all transfers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const transfers = await StockTransfer.findAll({
      where: { CompanyId: req.user.CompanyId },
      include: [
        { model: Warehouse, as: 'SourceWarehouse', attributes: ['id', 'warehouseCode', 'name'] },
        { model: Warehouse, as: 'DestinationWarehouse', attributes: ['id', 'warehouseCode', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(transfers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching stock transfers.' });
  }
});

// GET /api/inventory/transfers/:id - Get details of a single transfer
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const transfer = await StockTransfer.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [
        { model: Warehouse, as: 'SourceWarehouse', attributes: ['id', 'warehouseCode', 'name'] },
        { model: Warehouse, as: 'DestinationWarehouse', attributes: ['id', 'warehouseCode', 'name'] }
      ]
    });
    if (!transfer) return res.status(404).json({ error: 'Stock transfer not found.' });
    res.json(transfer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching stock transfer details.' });
  }
});

// POST /api/inventory/transfers - Create a new stock transfer
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { fromWarehouseId, toWarehouseId, transferDate, items, status } = req.body;

    if (!fromWarehouseId || !toWarehouseId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Source, destination and items list are required.' });
    }

    if (fromWarehouseId === toWarehouseId) {
      return res.status(400).json({ error: 'Source and Destination warehouses must be different.' });
    }

    // Validate stock levels in source warehouse before allowing creation
    const itemsList = typeof items === 'string' ? JSON.parse(items) : items;
    for (const itemObj of itemsList) {
      const { ItemId, quantity, batchNumber, lotNumber, serialNumber } = itemObj;

      const dbItem = await Item.findByPk(ItemId);
      if (!dbItem) {
        return res.status(404).json({ error: `Item ID ${ItemId} not found.` });
      }

      const sourceStockQuery = {
        ItemId,
        WarehouseId: fromWarehouseId,
        CompanyId: req.user.CompanyId
      };
      if (dbItem.trackingType === 'Batch' && batchNumber) sourceStockQuery.batchNumber = batchNumber;
      if (dbItem.trackingType === 'Lot' && lotNumber) sourceStockQuery.lotNumber = lotNumber;
      if (dbItem.trackingType === 'Serial' && serialNumber) sourceStockQuery.serialNumber = serialNumber;

      const sourceStock = await Stock.findOne({ where: sourceStockQuery });
      const availQty = sourceStock ? parseFloat(sourceStock.quantity) : 0;
      if (availQty < parseFloat(quantity)) {
        return res.status(400).json({
          error: `Insufficient Stock. Available Quantity: ${availQty}. Requested Transfer: ${quantity}.`
        });
      }
    }

    const transferNumber = await generateTransferCode(req.user.CompanyId);

    const transfer = await StockTransfer.create({
      transferNumber,
      transferDate: transferDate || new Date(),
      fromWarehouseId,
      toWarehouseId,
      status: status || 'Draft',
      items,
      CompanyId: req.user.CompanyId
    });

    res.status(201).json(transfer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error creating stock transfer.' });
  }
});

// PUT /api/inventory/transfers/:id/status - Update transfer status & handle inventory adjustments if Completed
router.put('/:id/status', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { status } = req.body;
    const transfer = await StockTransfer.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      transaction
    });

    if (!transfer) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Stock transfer not found.' });
    }

    if (transfer.status === 'Completed') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Completed transfers cannot be modified.' });
    }

    if (status === 'Completed') {
      // Perform stock adjustments for each item in transfer list
      const itemsList = typeof transfer.items === 'string' ? JSON.parse(transfer.items) : transfer.items;

      for (const itemObj of itemsList) {
        const { ItemId, quantity, batchNumber, lotNumber, serialNumber } = itemObj;

        const dbItem = await Item.findByPk(ItemId, { transaction });
        if (!dbItem) {
          await transaction.rollback();
          return res.status(404).json({ error: `Item ID ${ItemId} not found.` });
        }

        // Query stock in Source Warehouse
        const sourceStockQuery = {
          ItemId,
          WarehouseId: transfer.fromWarehouseId,
          CompanyId: req.user.CompanyId
        };
        if (dbItem.trackingType === 'Batch' && batchNumber) sourceStockQuery.batchNumber = batchNumber;
        if (dbItem.trackingType === 'Lot' && lotNumber) sourceStockQuery.lotNumber = lotNumber;
        if (dbItem.trackingType === 'Serial' && serialNumber) sourceStockQuery.serialNumber = serialNumber;

        const sourceStock = await Stock.findOne({ where: sourceStockQuery, transaction });
        const availQty = sourceStock ? parseFloat(sourceStock.quantity) : 0;
        if (availQty < parseFloat(quantity)) {
          await transaction.rollback();
          return res.status(400).json({
            error: `Insufficient Stock. Available Quantity: ${availQty}. Requested Transfer: ${quantity}.`
          });
        }

        // Deduct from Source Warehouse
        sourceStock.quantity = parseFloat(sourceStock.quantity) - parseFloat(quantity);
        await sourceStock.save({ transaction });

        // Add/update to Destination Warehouse
        const destStockQuery = {
          ItemId,
          WarehouseId: transfer.toWarehouseId,
          CompanyId: req.user.CompanyId
        };
        if (dbItem.trackingType === 'Batch' && batchNumber) destStockQuery.batchNumber = batchNumber;
        if (dbItem.trackingType === 'Lot' && lotNumber) destStockQuery.lotNumber = lotNumber;
        if (dbItem.trackingType === 'Serial' && serialNumber) destStockQuery.serialNumber = serialNumber;

        let destStock = await Stock.findOne({ where: destStockQuery, transaction });
        if (!destStock) {
          destStock = await Stock.create({
            ...destStockQuery,
            quantity: parseFloat(quantity),
            expiryDate: sourceStock.expiryDate
          }, { transaction });
        } else {
          destStock.quantity = parseFloat(destStock.quantity) + parseFloat(quantity);
          await destStock.save({ transaction });
        }

        // Write Stock Movement Audit Log
        await StockMovement.create({
          movementType: 'Transfer',
          referenceId: transfer.transferNumber,
          ItemId,
          fromWarehouseId: transfer.fromWarehouseId,
          toWarehouseId: transfer.toWarehouseId,
          quantity: parseFloat(quantity),
          batchNumber: dbItem.trackingType === 'Batch' ? batchNumber : null,
          lotNumber: dbItem.trackingType === 'Lot' ? lotNumber : null,
          serialNumber: dbItem.trackingType === 'Serial' ? serialNumber : null,
          movementDate: new Date(),
          CreatedByUserId: req.user.id,
          CompanyId: req.user.CompanyId
        }, { transaction });
      }
    }

    // Save new status
    transfer.status = status;
    await transfer.save({ transaction });

    await transaction.commit();
    res.json(transfer);
  } catch (err) {
    await transaction.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error updating stock transfer status.' });
  }
});

// PUT /api/inventory/transfers/:id - Edit transfer (if not completed)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { fromWarehouseId, toWarehouseId, transferDate, items, status, remarks } = req.body;
    const transfer = await StockTransfer.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });

    if (!transfer) {
      return res.status(404).json({ error: 'Stock transfer not found.' });
    }

    if (transfer.status === 'Completed') {
      return res.status(400).json({ error: 'Completed transfers cannot be edited.' });
    }

    const finalFromWarehouseId = fromWarehouseId || transfer.fromWarehouseId;
    const finalItems = items || transfer.items;

    // Validate stock levels in final source warehouse before allowing update
    const itemsList = typeof finalItems === 'string' ? JSON.parse(finalItems) : finalItems;
    for (const itemObj of itemsList) {
      const { ItemId, quantity, batchNumber, lotNumber, serialNumber } = itemObj;

      const dbItem = await Item.findByPk(ItemId);
      if (!dbItem) {
        return res.status(404).json({ error: `Item ID ${ItemId} not found.` });
      }

      const sourceStockQuery = {
        ItemId,
        WarehouseId: finalFromWarehouseId,
        CompanyId: req.user.CompanyId
      };
      if (dbItem.trackingType === 'Batch' && batchNumber) sourceStockQuery.batchNumber = batchNumber;
      if (dbItem.trackingType === 'Lot' && lotNumber) sourceStockQuery.lotNumber = lotNumber;
      if (dbItem.trackingType === 'Serial' && serialNumber) sourceStockQuery.serialNumber = serialNumber;

      const sourceStock = await Stock.findOne({ where: sourceStockQuery });
      const availQty = sourceStock ? parseFloat(sourceStock.quantity) : 0;
      if (availQty < parseFloat(quantity)) {
        return res.status(400).json({
          error: `Insufficient Stock. Available Quantity: ${availQty}. Requested Transfer: ${quantity}.`
        });
      }
    }

    await transfer.update({
      fromWarehouseId: finalFromWarehouseId,
      toWarehouseId: toWarehouseId || transfer.toWarehouseId,
      transferDate: transferDate || transfer.transferDate,
      items: finalItems,
      status: status || transfer.status,
      remarks: remarks !== undefined ? remarks : transfer.remarks
    });

    res.json(transfer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating stock transfer.' });
  }
});

// DELETE /api/inventory/transfers/:id - Delete transfer
router.delete('/:id', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const transfer = await StockTransfer.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      transaction
    });

    if (!transfer) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Stock transfer not found.' });
    }

    if (transfer.status === 'Completed') {
      const itemsList = typeof transfer.items === 'string' ? JSON.parse(transfer.items) : transfer.items;

      for (const itemObj of itemsList) {
        const { ItemId, quantity, batchNumber, lotNumber, serialNumber } = itemObj;

        const dbItem = await Item.findByPk(ItemId, { transaction });
        if (dbItem) {
          // Revert: Add back to Source Warehouse
          const sourceStockQuery = {
            ItemId,
            WarehouseId: transfer.fromWarehouseId,
            CompanyId: req.user.CompanyId
          };
          if (dbItem.trackingType === 'Batch' && batchNumber) sourceStockQuery.batchNumber = batchNumber;
          if (dbItem.trackingType === 'Lot' && lotNumber) sourceStockQuery.lotNumber = lotNumber;
          if (dbItem.trackingType === 'Serial' && serialNumber) sourceStockQuery.serialNumber = serialNumber;

          let sourceStock = await Stock.findOne({ where: sourceStockQuery, transaction });
          if (sourceStock) {
            sourceStock.quantity = parseFloat(sourceStock.quantity) + parseFloat(quantity);
            await sourceStock.save({ transaction });
          }

          // Revert: Subtract from Destination Warehouse
          const destStockQuery = {
            ItemId,
            WarehouseId: transfer.toWarehouseId,
            CompanyId: req.user.CompanyId
          };
          if (dbItem.trackingType === 'Batch' && batchNumber) destStockQuery.batchNumber = batchNumber;
          if (dbItem.trackingType === 'Lot' && lotNumber) destStockQuery.lotNumber = lotNumber;
          if (dbItem.trackingType === 'Serial' && serialNumber) destStockQuery.serialNumber = serialNumber;

          let destStock = await Stock.findOne({ where: destStockQuery, transaction });
          if (destStock) {
            destStock.quantity = parseFloat(destStock.quantity) - parseFloat(quantity);
            await destStock.save({ transaction });
          }
        }
      }

      // Delete stock movement records
      await StockMovement.destroy({
        where: { referenceId: transfer.transferNumber, CompanyId: req.user.CompanyId },
        transaction
      });
    }

    await transfer.destroy({ transaction });
    await transaction.commit();
    res.json({ message: 'Stock transfer deleted successfully.' });
  } catch (err) {
    await transaction.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error deleting stock transfer.' });
  }
});

export default router;

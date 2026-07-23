import express from 'express';
import sequelize from '../config/db.js';
import Stock from '../models/stock.js';
import StockMovement from '../models/stockMovement.js';
import Item from '../models/item.js';
import Warehouse from '../models/warehouse.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/inventory/reports/ledger - Stock Transaction Ledger
router.get('/ledger', authenticateToken, async (req, res) => {
  try {
    const { WarehouseId, ItemId, startDate, endDate } = req.query;
    const whereClause = { CompanyId: req.user.CompanyId };

    if (ItemId) whereClause.ItemId = ItemId;
    
    if (WarehouseId) {
      whereClause[sequelize.Sequelize.Op.or] = [
        { fromWarehouseId: WarehouseId },
        { toWarehouseId: WarehouseId }
      ];
    }

    if (startDate || endDate) {
      whereClause.movementDate = {};
      if (startDate) whereClause.movementDate[sequelize.Sequelize.Op.gte] = new Date(startDate);
      if (endDate) whereClause.movementDate[sequelize.Sequelize.Op.lte] = new Date(endDate);
    }

    const movements = await StockMovement.findAll({
      where: whereClause,
      include: [
        { model: Item, attributes: ['id', 'itemCode', 'name', 'unit'] },
        { model: Warehouse, as: 'FromWarehouse', attributes: ['id', 'warehouseCode', 'name'] },
        { model: Warehouse, as: 'ToWarehouse', attributes: ['id', 'warehouseCode', 'name'] }
      ],
      order: [['movementDate', 'ASC']]
    });

    res.json(movements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error generating stock ledger.' });
  }
});

// GET /api/inventory/reports/aging - Stock Aging Report
router.get('/aging', authenticateToken, async (req, res) => {
  try {
    const stocks = await Stock.findAll({
      where: {
        CompanyId: req.user.CompanyId,
        quantity: { [sequelize.Sequelize.Op.gt]: 0 }
      },
      include: [
        { model: Item, attributes: ['id', 'itemCode', 'name', 'unit'] },
        { model: Warehouse, attributes: ['id', 'warehouseCode', 'name'] }
      ],
      order: [['createdAt', 'ASC']]
    });

    const now = new Date();
    const agedStocks = stocks.map(stock => {
      const createdDate = new Date(stock.createdAt);
      const daysOld = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
      
      let bracket = '0-30 Days';
      if (daysOld > 180) bracket = '180+ Days';
      else if (daysOld > 90) bracket = '91-180 Days';
      else if (daysOld > 60) bracket = '61-90 Days';
      else if (daysOld > 30) bracket = '31-60 Days';

      return {
        ...stock.toJSON(),
        daysOld,
        bracket
      };
    });

    res.json(agedStocks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error generating stock aging report.' });
  }
});

// GET /api/inventory/reports/valuation - Stock Valuation Report
router.get('/valuation', authenticateToken, async (req, res) => {
  try {
    const stocks = await Stock.findAll({
      where: {
        CompanyId: req.user.CompanyId,
        quantity: { [sequelize.Sequelize.Op.gt]: 0 }
      },
      include: [
        { model: Item, attributes: ['id', 'itemCode', 'name', 'unit', 'purchasePrice', 'sellingPrice'] },
        { model: Warehouse, attributes: ['id', 'warehouseCode', 'name'] }
      ]
    });

    const valuationData = stocks.map(stock => {
      const qty = parseFloat(stock.quantity);
      const purchasePrice = parseFloat(stock.Item?.purchasePrice || 0);
      const sellingPrice = parseFloat(stock.Item?.sellingPrice || 0);
      
      return {
        id: stock.id,
        itemCode: stock.Item?.itemCode || '-',
        itemName: stock.Item?.name || '-',
        warehouseName: stock.Warehouse?.name || '-',
        quantity: qty,
        unit: stock.Item?.unit || '',
        purchasePrice,
        sellingPrice,
        totalCostValue: qty * purchasePrice,
        totalSalesValue: qty * sellingPrice
      };
    });

    const summary = valuationData.reduce((acc, curr) => {
      acc.totalQuantity += curr.quantity;
      acc.totalCostValue += curr.totalCostValue;
      acc.totalSalesValue += curr.totalSalesValue;
      return acc;
    }, { totalQuantity: 0, totalCostValue: 0, totalSalesValue: 0 });

    res.json({ valuationData, summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error generating stock valuation report.' });
  }
});

// GET /api/inventory/reports/velocity - Fast, Slow & Dead Stock Report
router.get('/velocity', authenticateToken, async (req, res) => {
  try {
    // 1. Get all active items
    const items = await Item.findAll({
      where: { CompanyId: req.user.CompanyId, status: 'Active' },
      attributes: ['id', 'itemCode', 'name', 'unit', 'purchasePrice']
    });

    // 2. Get stock movement sums for Outward/Consumption in the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const movements = await StockMovement.findAll({
      where: {
        CompanyId: req.user.CompanyId,
        movementType: ['Outward', 'Consumption'],
        movementDate: {
          [sequelize.Sequelize.Op.gte]: ninetyDaysAgo
        }
      },
      attributes: ['ItemId', 'quantity']
    });

    // Map aggregate usage quantity per ItemId
    const itemMovementMap = {};
    movements.forEach(mv => {
      itemMovementMap[mv.ItemId] = (itemMovementMap[mv.ItemId] || 0) + parseFloat(mv.quantity);
    });

    // 3. Get current total stock per item
    const stocks = await Stock.findAll({
      where: { CompanyId: req.user.CompanyId },
      attributes: ['ItemId', 'quantity']
    });

    const itemStockMap = {};
    stocks.forEach(st => {
      itemStockMap[st.ItemId] = (itemStockMap[st.ItemId] || 0) + parseFloat(st.quantity);
    });

    // 4. Classify each item
    const classified = items.map(item => {
      const consumedQty = itemMovementMap[item.id] || 0;
      const currentStock = itemStockMap[item.id] || 0;

      let classification = 'Dead Stock';
      if (consumedQty > 100) classification = 'Fast Moving';
      else if (consumedQty > 0) classification = 'Slow Moving';

      return {
        id: item.id,
        itemCode: item.itemCode || '-',
        name: item.name,
        unit: item.unit || '',
        currentStock,
        consumedQty90Days: consumedQty,
        classification
      };
    });

    // Filter out items with zero current stock and zero movement (deleted/inactive)
    const filteredClassified = classified.filter(item => !(item.currentStock <= 0 && item.consumedQty90Days <= 0));

    res.json(filteredClassified);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error generating stock velocity report.' });
  }
});

export default router;

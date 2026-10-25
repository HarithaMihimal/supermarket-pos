import { Request, Response, NextFunction } from 'express';
import { inventoryAdjustmentSchema } from '../schemas/inventorySchema';
import { productIdSchema } from '../schemas/productSchema';
import * as inventoryService from '../services/inventoryService';

export async function listInventory(req: Request, res: Response, next: NextFunction) {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    const lowStockOnly = req.query.low_stock === 'true';
    const branchId = req.query.branch_id
      ? productIdSchema.parse(req.query.branch_id)
      : 1;

    res.json({
      success: true,
      data: await inventoryService.listInventory(search, lowStockOnly, branchId),
    });
  } catch (error) {
    next(error);
  }
}

export async function adjustInventory(req: Request, res: Response, next: NextFunction) {
  try {
    const data = inventoryAdjustmentSchema.parse(req.body);
    const movement = await inventoryService.adjustInventory(data);

    res.status(201).json({
      success: true,
      message: 'Inventory updated successfully',
      data: movement,
    });
  } catch (error) {
    next(error);
  }
}

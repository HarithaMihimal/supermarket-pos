import type { NextFunction, Request, Response } from 'express';
import { stockTransferSchema } from '../schemas/inventorySchema';
import * as stockTransferService from '../services/stockTransferService';
import { writeAudit } from '../utils/audit';

export async function listStockTransfers(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new Error('Authenticated user context is missing');
    res.json({ success: true, data: await stockTransferService.listStockTransfers(req.user.branchId) });
  } catch (error) {
    next(error);
  }
}

export async function createStockTransfer(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new Error('Authenticated user context is missing');
    const data = stockTransferSchema.parse(req.body);
    const transfer = await stockTransferService.createStockTransfer(data, req.user.branchId, req.user.userId);
    await writeAudit(req, 'stock.transfer_created', 'stock_transfer', transfer.transfer_id, {
      destination_branch_id: data.destination_branch_id,
      items: data.items,
    });
    res.status(201).json({ success: true, data: transfer });
  } catch (error) {
    next(error);
  }
}

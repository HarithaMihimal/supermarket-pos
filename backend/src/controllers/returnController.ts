import { Request, Response, NextFunction } from 'express';
import { productIdSchema } from '../schemas/productSchema';
import { returnSchema } from '../schemas/returnSchema';
import * as returnService from '../services/returnService';
import { writeAudit } from '../utils/audit';

export async function getReturnableSale(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new Error('Authenticated user context is missing');
    const saleId = productIdSchema.parse(req.params.id);
    res.json({ success: true, data: await returnService.getReturnableSale(saleId, req.user.branchId) });
  } catch (error) {
    next(error);
  }
}

export async function createReturn(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new Error('Authenticated user context is missing');
    const result = await returnService.createReturn({
      ...returnSchema.parse(req.body),
      branch_id: req.user.branchId,
      processed_by: req.user.userId,
    });
    await writeAudit(req, 'return.created', 'sale', result.sale_id, {
      return_id: result.return_id,
      refund_amount: result.refund_amount,
      reason: result.reason,
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

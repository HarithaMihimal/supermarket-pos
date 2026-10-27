import { Request, Response, NextFunction } from 'express';
import { saleSchema } from '../schemas/saleSchema';
import { salesHistoryQuerySchema } from '../schemas/salesHistorySchema';
import * as saleService from '../services/saleService';
import { writeAudit } from '../utils/audit';

export async function createSale(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new Error('Authenticated user context is missing');
    const sale = await saleService.createSale({
      ...saleSchema.parse(req.body),
      branch_id: req.user.branchId,
      cashier_id: req.user.userId,
    });
    await writeAudit(req, 'sale.created', 'sale', sale.sale_id, {
      payment_method: sale.payment_method,
      total: sale.total_amount,
    });
    res.status(201).json({ success: true, data: sale });
  } catch (error) {
    next(error);
  }
}

export async function listSales(req: Request, res: Response, next: NextFunction) {
  try {
    const query = salesHistoryQuerySchema.parse(req.query);
    res.json({ success: true, data: await saleService.listSales(query) });
  } catch (error) {
    next(error);
  }
}

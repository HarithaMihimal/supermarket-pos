import { Request, Response, NextFunction } from 'express';
import { saleSchema } from '../schemas/saleSchema';
import { salesHistoryQuerySchema } from '../schemas/salesHistorySchema';
import * as saleService from '../services/saleService';

export async function createSale(req: Request, res: Response, next: NextFunction) {
  try {
    const sale = await saleService.createSale(saleSchema.parse(req.body));
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

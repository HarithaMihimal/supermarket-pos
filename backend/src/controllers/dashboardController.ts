import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboardService';

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new Error('Authenticated user context is missing');
    res.json({ success: true, data: await dashboardService.getDashboard(req.user.branchId) });
  } catch (error) {
    next(error);
  }
}

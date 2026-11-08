import { Request, Response, NextFunction } from 'express';
import { settingsSchema } from '../schemas/settingsSchema';
import * as settingsService from '../services/settingsService';
import { writeAudit } from '../utils/audit';

export async function getSettings(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new Error('Authenticated user context is missing');
    res.json({ success: true, data: await settingsService.getSettings(req.user.branchId) });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const data = settingsSchema.parse(req.body);
    if (!req.user) throw new Error('Authenticated user context is missing');
    const settings = await settingsService.updateSettings(data, req.user.branchId);
    await writeAudit(req, 'settings.updated', 'branch', settings.branch_id);
    res.json({
      success: true,
      message: 'Shop settings updated successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

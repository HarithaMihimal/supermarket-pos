import { Request, Response, NextFunction } from 'express';
import { settingsSchema } from '../schemas/settingsSchema';
import * as settingsService from '../services/settingsService';
import { writeAudit } from '../utils/audit';

export async function getSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await settingsService.getSettings() });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const data = settingsSchema.parse(req.body);
    const settings = await settingsService.updateSettings(data);
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

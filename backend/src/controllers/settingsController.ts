import { Request, Response, NextFunction } from 'express';
import { settingsSchema } from '../schemas/settingsSchema';
import * as settingsService from '../services/settingsService';

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
    res.json({
      success: true,
      message: 'Shop settings updated successfully',
      data: await settingsService.updateSettings(data),
    });
  } catch (error) {
    next(error);
  }
}

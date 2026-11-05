import { NextFunction, Request, Response } from 'express';
import * as reportService from '../services/reportService';
import { reportQuerySchema } from '../schemas/reportSchema';

export async function getManagementReports(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) throw new Error('Authenticated user context is missing');
        const query = reportQuerySchema.parse(req.query);
        res.json({ success: true, data: await reportService.getManagementReports(req.user.branchId, query) });
    } catch (error) {
        next(error);
    }
}
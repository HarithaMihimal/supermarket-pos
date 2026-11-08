import type { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { branchUserSchema, branchSchema } from '../schemas/branchSchema';
import { productIdSchema } from '../schemas/productSchema';
import * as branchService from '../services/branchService';
import { writeAudit } from '../utils/audit';

export async function listBranches(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await branchService.listBranches() });
  } catch (error) {
    next(error);
  }
}

export async function createBranch(req: Request, res: Response, next: NextFunction) {
  try {
    const branch = await branchService.createBranch(branchSchema.parse(req.body));
    await writeAudit(req, 'branch.created', 'branch', branch.branch_id, { name: branch.name });
    res.status(201).json({ success: true, data: branch });
  } catch (error) {
    next(error);
  }
}

export async function listBranchUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = productIdSchema.parse(req.params.id);
    res.json({ success: true, data: await branchService.listBranchUsers(branchId) });
  } catch (error) {
    next(error);
  }
}

export async function createBranchUser(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = productIdSchema.parse(req.params.id);
    const data = branchUserSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await branchService.createBranchUser(branchId, data, passwordHash);
    await writeAudit(req, 'user.created', 'user', user.user_id, {
      role: user.role,
      branch_id: branchId,
    });
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

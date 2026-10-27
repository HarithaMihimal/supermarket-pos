import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';

export type UserRole = 'admin' | 'manager' | 'cashier';

const jwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return secret;
};

export function signToken(user: Express.Request['user']) {
  if (!user) throw new Error('Cannot create a token without a user');
  return jwt.sign(user, jwtSecret(), { expiresIn: '8h' });
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return next(new AppError(401, 'Authentication required'));

  try {
    const payload = jwt.verify(token, jwtSecret());
    if (typeof payload !== 'object' || !payload || typeof payload.userId !== 'number'
      || typeof payload.branchId !== 'number' || typeof payload.role !== 'string') {
      return next(new AppError(401, 'Invalid authentication token'));
    }
    req.user = payload as NonNullable<Express.Request['user']>;
    return next();
  } catch {
    return next(new AppError(401, 'Invalid or expired authentication token'));
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, 'Authentication required'));
    if (!roles.includes(req.user.role)) return next(new AppError(403, 'You do not have permission to perform this action'));
    return next();
  };
}

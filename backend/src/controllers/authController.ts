import type { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { loginSchema, signupSchema } from '../schemas/authSchema';
import * as authRepository from '../repositories/authRepository';
import { signToken } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import { writeAudit } from '../utils/audit';

function sessionUser(user: {
  user_id: number | string;
  branch_id: number | string;
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'cashier';
}) {
  return {
    userId: Number(user.user_id),
    branchId: Number(user.branch_id),
    fullName: user.full_name,
    email: user.email,
    role: user.role,
  } as const;
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await authRepository.findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new AppError(401, 'Invalid email or password');
    }

    const currentUser = sessionUser(user);
    res.json({ success: true, data: { token: signToken(currentUser), user: currentUser } });
  } catch (error) {
    next(error);
  }
}

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const data = signupSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await authRepository.createUser(data, passwordHash);
    const currentUser = sessionUser(user);
    await writeAudit({ user: currentUser, requestId: req.requestId } as Request, 'user.created', 'user', user.user_id, {
      role: 'cashier',
    });
    res.status(201).json({ success: true, data: { token: signToken(currentUser), user: currentUser } });
  } catch (error) {
    next(error);
  }
}

export function currentUser(req: Request, res: Response) {
  res.json({ success: true, data: req.user });
}

import type { UserRole } from '../middleware/auth';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        branchId: number;
        fullName: string;
        email: string;
        role: UserRole;
      };
      requestId?: string;
    }
  }
}

export {};

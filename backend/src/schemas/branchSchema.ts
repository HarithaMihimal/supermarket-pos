import { z } from 'zod';
import { signupSchema } from './authSchema';

export const branchSchema = z.object({
  name: z.string().trim().min(2).max(100),
  address: z.string().trim().max(1000).optional(),
}).strict();

export const branchUserSchema = signupSchema.extend({
  role: z.enum(['manager', 'cashier']),
}).strict();

export type BranchInput = z.infer<typeof branchSchema>;
export type BranchUserInput = z.infer<typeof branchUserSchema>;

import { z } from 'zod';

export const salesHistoryQuerySchema = z.object({
  branch_id: z.coerce.number().int().positive().default(1),
  search: z.string().trim().max(100).optional(),
  payment_method: z.enum(['all', 'cash', 'card', 'bank_transfer']).default('all'),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict();

export type SalesHistoryQuery = z.infer<typeof salesHistoryQuerySchema>;

import { z } from 'zod';

const saleItemSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().positive().finite(),
}).strict();

export const saleSchema = z.object({
  branch_id: z.number().int().positive().default(1),
  cashier_id: z.number().int().positive().default(1),
  items: z.array(saleItemSchema).min(1).max(100),
  payment_method: z.enum(['cash', 'card', 'bank_transfer']),
  amount_paid: z.number().positive().finite(),
}).strict();

export type SaleInput = z.infer<typeof saleSchema>;

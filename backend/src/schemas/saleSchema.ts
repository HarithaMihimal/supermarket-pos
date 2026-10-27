import { z } from 'zod';

const saleItemSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  quantity: z.number().positive().finite(),
}).strict();

export const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1).max(100),
  payment_method: z.enum(['cash', 'card', 'bank_transfer']),
  amount_paid: z.number().positive().finite(),
  payment_reference: z.string().trim().max(150).optional(),
}).strict();

export type SaleInput = z.infer<typeof saleSchema>;
export type AuthorizedSaleInput = SaleInput & {
  branch_id: number;
  cashier_id: number;
};

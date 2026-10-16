import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().trim().min(2).max(200),
  barcode: z.string().trim().min(3).max(100),
  category_id: z.number().int().positive(),
  cost_price: z.number().finite().nonnegative(),
  selling_price: z.number().finite().nonnegative(),
  active: z.boolean().default(true),
}).strict().refine(
  (data) =>
    Number.isInteger(data.cost_price * 100) &&
    Number.isInteger(data.selling_price * 100),
  {
    message: 'Prices must have at most 2 decimal places',
    path: ['selling_price'],
  }
);

export const productIdSchema = z.coerce.number()
  .int()
  .positive()
  .safe();

export type ProductInput = z.infer<typeof productSchema>;
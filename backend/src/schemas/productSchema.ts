import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().trim().min(2).max(200),
  barcode: z.string().trim().min(3).max(100),
  category_id: z.number().int().positive(),
  cost_price: z.number().finite().nonnegative(),
  selling_price: z.number().finite().nonnegative(),
  active: z.boolean().default(true),
  initial_quantity: z.number().finite().nonnegative().default(0),
  reorder_level: z.number().finite().nonnegative().default(10),
}).strict().refine(
  (data) =>
    Number.isInteger(data.cost_price * 100) &&
    Number.isInteger(data.selling_price * 100),
  {
    message: 'Prices must have at most 2 decimal places',
    path: ['selling_price'],
  },
).refine(
  data => Number.isInteger(data.initial_quantity * 1000) && Number.isInteger(data.reorder_level * 1000),
  {
    message: 'Quantities must have at most 3 decimal places',
    path: ['initial_quantity'],
  },
);

export const productIdSchema = z.coerce.number()
  .int()
  .positive()
  .safe();

export type ProductInput = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
}).strict();
export type CategoryInput = z.infer<typeof categorySchema>;
import { z } from 'zod';

export const productImportRowSchema = z.object({
  name: z.string().trim().min(2).max(200),
  barcode: z.string().trim().min(3).max(100),
  category: z.string().trim().min(2).max(100),
  cost_price: z.coerce.number().finite().nonnegative(),
  selling_price: z.coerce.number().finite().nonnegative(),
  initial_quantity: z.coerce.number().finite().nonnegative().default(0),
  reorder_level: z.coerce.number().finite().nonnegative().default(10),
  active: z.string().trim().toLowerCase().default('true').transform(value => value !== 'false'),
}).strict().refine(
  data => Number.isInteger(data.cost_price * 100) && Number.isInteger(data.selling_price * 100),
  { message: 'Prices must have at most 2 decimal places' },
).refine(
  data => Number.isInteger(data.initial_quantity * 1000) && Number.isInteger(data.reorder_level * 1000),
  { message: 'Quantities must have at most 3 decimal places' },
);

export type ProductImportRow = z.infer<typeof productImportRowSchema>;

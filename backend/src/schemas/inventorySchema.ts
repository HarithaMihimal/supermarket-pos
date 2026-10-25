import { z } from 'zod';

export const inventoryAdjustmentSchema = z.object({
  branch_id: z.number().int().positive().default(1),
  product_id: z.number().int().positive(),
  quantity_delta: z.number().finite().refine(value => value !== 0, {
    message: 'Quantity adjustment cannot be zero',
  }),
  reason: z.enum(['receipt', 'adjustment', 'damage']),
  note: z.string().trim().max(500).optional(),
}).strict().refine(
  data => Number.isInteger(data.quantity_delta * 1000),
  { message: 'Quantity must have at most 3 decimal places', path: ['quantity_delta'] },
);

export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;

import { z } from 'zod';

export const inventoryAdjustmentSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  quantity_delta: z.coerce.number().finite().refine(value => value !== 0, {
    message: 'Quantity adjustment cannot be zero',
  }),
  reason: z.enum(['receipt', 'adjustment', 'damage', 'opening_balance']),
  note: z.string().trim().max(500).optional(),
}).strict().refine(
  data => Number.isInteger(data.quantity_delta * 1000),
  { message: 'Quantity must have at most 3 decimal places', path: ['quantity_delta'] },
);

export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;

export const stockTransferSchema = z.object({
  destination_branch_id: z.coerce.number().int().positive(),
  items: z.array(z.object({
    product_id: z.coerce.number().int().positive(),
    quantity: z.coerce.number().finite().positive().refine(value => Number.isInteger(value * 1000), {
      message: 'Quantity must have at most 3 decimal places',
    }),
  }).strict()).min(1).max(100),
  note: z.string().trim().max(500).optional(),
}).strict().refine(
  data => new Set(data.items.map(item => item.product_id)).size === data.items.length,
  { message: 'Each product may only appear once in a transfer', path: ['items'] },
);

export type StockTransferInput = z.infer<typeof stockTransferSchema>;

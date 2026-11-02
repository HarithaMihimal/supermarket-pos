import { z } from 'zod';

const returnItemSchema = z.object({
  sale_item_id: z.coerce.number().int().positive(),
  quantity: z.number().positive().finite(),
}).strict();

export const returnSchema = z.object({
  sale_id: z.coerce.number().int().positive(),
  items: z.array(returnItemSchema).min(1).max(100),
  reason: z.string().trim().min(2).max(500),
}).strict().refine(
  data => new Set(data.items.map(item => item.sale_item_id)).size === data.items.length,
  { message: 'Each receipt item can only be returned once', path: ['items'] },
);

export type ReturnInput = z.infer<typeof returnSchema>;
export type AuthorizedReturnInput = ReturnInput & {
  branch_id: number;
  processed_by: number;
};

import { z } from 'zod';

const quantity = z.number().finite().positive().refine(value => Number.isInteger(value * 1000), {
  message: 'Quantities must have at most 3 decimal places',
});
const amount = z.number().finite().nonnegative().refine(value => Number.isInteger(value * 100), {
  message: 'Prices must have at most 2 decimal places',
});

export const supplierSchema = z.object({
  name: z.string().trim().min(2).max(200),
  contact_name: z.string().trim().max(150).optional(),
  email: z.string().trim().email().max(255).optional().or(z.literal('')),
  phone: z.string().trim().max(50).optional(),
  address: z.string().trim().max(500).optional(),
}).strict();

export const purchaseOrderSchema = z.object({
  supplier_id: z.number().int().positive(),
  expected_date: z.string().date().optional(),
  notes: z.string().trim().max(500).optional(),
  items: z.array(z.object({
    product_id: z.number().int().positive(),
    ordered_quantity: quantity,
    unit_cost: amount,
  }).strict()).min(1),
}).strict();

export const goodsReceiptSchema = z.object({
  note: z.string().trim().max(500).optional(),
  items: z.array(z.object({
    purchase_order_item_id: z.number().int().positive(),
    quantity,
  }).strict()).min(1),
}).strict();

export type SupplierInput = z.infer<typeof supplierSchema>;
export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;
export type GoodsReceiptInput = z.infer<typeof goodsReceiptSchema>;

import assert from 'node:assert/strict';
import test from 'node:test';
import { loginSchema, signupSchema } from '../src/schemas/authSchema';
import { saleSchema } from '../src/schemas/saleSchema';
import { productSchema } from '../src/schemas/productSchema';
import { inventoryAdjustmentSchema, stockTransferSchema } from '../src/schemas/inventorySchema';
import { reportQuerySchema } from '../src/schemas/reportSchema';
import { salesHistoryQuerySchema } from '../src/schemas/salesHistorySchema';

test('login schema rejects malformed credentials', () => {
  assert.equal(loginSchema.safeParse({ email: 'not-an-email', password: '' }).success, false);
});

test('signup schema requires a strong enough password and name', () => {
  assert.equal(signupSchema.safeParse({
    full_name: 'New Cashier',
    email: 'cashier@example.com',
    password: 'short',
  }).success, false);
  assert.equal(signupSchema.safeParse({
    full_name: 'New Cashier',
    email: 'cashier@example.com',
    password: 'secure-password',
  }).success, true);
});

test('sale schema accepts supported payment methods and references', () => {
  const result = saleSchema.safeParse({
    items: [{ product_id: 1, quantity: 2 }],
    payment_method: 'card',
    amount_paid: 20,
    payment_reference: 'AUTH-123',
  });
  assert.equal(result.success, true);
});

test('product schema rejects prices with more than two decimals', () => {
  assert.equal(productSchema.safeParse({
    name: 'Test product',
    barcode: '12345',
    category_id: 1,
    cost_price: 1.001,
    selling_price: 2,
    active: true,
  }).success, false);
});

test('inventory adjustment schema accepts numeric values returned by PostgreSQL', () => {
  const result = inventoryAdjustmentSchema.safeParse({
    product_id: '1',
    quantity_delta: '2',
    reason: 'receipt',
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.product_id, 1);
    assert.equal(result.data.quantity_delta, 2);
  }
});

test('inventory adjustments cannot select another branch', () => {
  assert.equal(inventoryAdjustmentSchema.safeParse({
    branch_id: 2,
    product_id: 1,
    quantity_delta: 1,
    reason: 'adjustment',
  }).success, false);
});

test('stock transfer schema validates precision and rejects duplicate products', () => {
  assert.equal(stockTransferSchema.safeParse({
    destination_branch_id: 2,
    items: [{ product_id: 1, quantity: 1.125 }],
  }).success, true);
  assert.equal(stockTransferSchema.safeParse({
    destination_branch_id: 2,
    items: [{ product_id: 1, quantity: 1 }, { product_id: 1, quantity: 2 }],
  }).success, false);
  assert.equal(stockTransferSchema.safeParse({
    destination_branch_id: 2,
    items: [{ product_id: 1, quantity: 1.0001 }],
  }).success, false);
});

test('sales history requests cannot select another branch', () => {
  assert.equal(salesHistoryQuerySchema.safeParse({ branch_id: 2 }).success, false);
  assert.equal(salesHistoryQuerySchema.safeParse({ payment_method: 'cash' }).success, true);
});

test('report query accepts valid date ranges and grouping', () => {
  const result = reportQuerySchema.safeParse({
    from: '2026-10-01',
    to: '2026-10-31',
    group_by: 'month',
  });
  assert.equal(result.success, true);
});

test('report query rejects invalid dates and reversed ranges', () => {
  assert.equal(reportQuerySchema.safeParse({
    from: '2026-02-30',
    to: '2026-03-01',
  }).success, false);
  assert.equal(reportQuerySchema.safeParse({
    from: '2026-10-02',
    to: '2026-10-01',
  }).success, false);
});

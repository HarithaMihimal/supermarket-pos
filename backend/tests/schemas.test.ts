import assert from 'node:assert/strict';
import test from 'node:test';
import { loginSchema, signupSchema } from '../src/schemas/authSchema';
import { saleSchema } from '../src/schemas/saleSchema';
import { productSchema } from '../src/schemas/productSchema';

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

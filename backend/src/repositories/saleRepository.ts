import { pool } from '../config/database';
import { SaleInput } from '../schemas/saleSchema';
import { AppError } from '../utils/AppError';

export async function createSale(data: SaleInput) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const requestedQuantities = new Map<number, number>();
    for (const item of data.items) {
      requestedQuantities.set(
        item.product_id,
        (requestedQuantities.get(item.product_id) ?? 0) + item.quantity,
      );
    }
    const productIds = [...requestedQuantities.keys()];
    const products = await client.query(
      `SELECT p.product_id, p.name, p.selling_price, i.quantity
       FROM products p
       JOIN inventory i ON i.product_id = p.product_id AND i.branch_id = $1
       WHERE p.product_id = ANY($2::bigint[]) AND p.active = TRUE
       FOR UPDATE`,
      [data.branch_id, productIds],
    );

    if (products.rows.length !== new Set(productIds).size) {
      throw new AppError(400, 'One or more products are unavailable');
    }

    const productMap = new Map(products.rows.map(product => [Number(product.product_id), product]));
    let total = 0;
    const lineItems = data.items.map(item => {
      const product = productMap.get(item.product_id);
      const requestedQuantity = requestedQuantities.get(item.product_id) ?? 0;
      if (!product || Number(product.quantity) < requestedQuantity) {
        throw new AppError(400, `Insufficient stock for ${product?.name ?? 'product'}`);
      }
      const unitPrice = Number(product.selling_price);
      const subtotal = Math.round(unitPrice * item.quantity * 100) / 100;
      total += subtotal;
      return { ...item, unitPrice, subtotal };
    });

    total = Math.round(total * 100) / 100;
    if (data.amount_paid < total) {
      throw new AppError(400, 'Payment amount is less than the sale total');
    }

    const sale = await client.query(
      `INSERT INTO sales (branch_id, cashier_id, total_amount)
       VALUES ($1, $2, $3) RETURNING sale_id, total_amount, created_at`,
      [data.branch_id, data.cashier_id, total],
    );

    for (const item of lineItems) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [sale.rows[0].sale_id, item.product_id, item.quantity, item.unitPrice, item.subtotal],
      );
      await client.query(
        `UPDATE inventory SET quantity = quantity - $1
         WHERE branch_id = $2 AND product_id = $3`,
        [item.quantity, data.branch_id, item.product_id],
      );
      await client.query(
        `INSERT INTO inventory_movements
           (branch_id, product_id, quantity_delta, reason, note)
         VALUES ($1, $2, $3, 'sale', $4)`,
        [data.branch_id, item.product_id, -item.quantity, `Sale ${sale.rows[0].sale_id}`],
      );
    }

    await client.query(
      `INSERT INTO payments (sale_id, amount, payment_method)
       VALUES ($1, $2, $3)`,
      [sale.rows[0].sale_id, data.amount_paid, data.payment_method],
    );
    await client.query('COMMIT');

    return {
      ...sale.rows[0],
      change: Math.round((data.amount_paid - total) * 100) / 100,
      items: lineItems,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

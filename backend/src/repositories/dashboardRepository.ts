import { pool } from '../config/database';

export async function getDashboard(branchId: number) {
  const [summary, paymentTotals, lowStock, bestSelling] = await Promise.all([
    pool.query(`
      SELECT
        (SELECT COALESCE(SUM(s.total_amount), 0)
         FROM sales s
         WHERE s.branch_id = $1 AND s.status = 'completed'
           AND s.created_at >= CURRENT_DATE
           AND s.created_at < CURRENT_DATE + INTERVAL '1 day') AS total_sales,
        (SELECT COALESCE(SUM(si.subtotal - (si.quantity * p.cost_price)), 0)
         FROM sale_items si
         JOIN sales s ON s.sale_id = si.sale_id
         JOIN products p ON p.product_id = si.product_id
         WHERE s.branch_id = $1 AND s.status = 'completed'
           AND s.created_at >= CURRENT_DATE
           AND s.created_at < CURRENT_DATE + INTERVAL '1 day') AS total_profit,
        (SELECT COUNT(*)::int
         FROM sales s
         WHERE s.branch_id = $1 AND s.status = 'completed'
           AND s.created_at >= CURRENT_DATE
           AND s.created_at < CURRENT_DATE + INTERVAL '1 day') AS transaction_count
    `, [branchId]),
    pool.query(`
      SELECT p.payment_method, COALESCE(SUM(p.amount), 0) AS total
      FROM payments p
      JOIN sales s ON s.sale_id = p.sale_id
      WHERE s.branch_id = $1
        AND s.status = 'completed'
        AND p.created_at >= CURRENT_DATE
        AND p.created_at < CURRENT_DATE + INTERVAL '1 day'
      GROUP BY p.payment_method
    `, [branchId]),
    pool.query(`
      SELECT i.product_id, p.name, p.barcode, i.quantity, i.reorder_level
      FROM inventory i
      JOIN products p ON p.product_id = i.product_id
      WHERE i.branch_id = $1
        AND p.active = TRUE
        AND i.quantity <= i.reorder_level
      ORDER BY (i.reorder_level - i.quantity) DESC, p.name
      LIMIT 10
    `, [branchId]),
    pool.query(`
      SELECT p.product_id, p.name, p.barcode,
             SUM(si.quantity) AS quantity_sold,
             SUM(si.subtotal) AS sales_amount
      FROM sale_items si
      JOIN sales s ON s.sale_id = si.sale_id
      JOIN products p ON p.product_id = si.product_id
      WHERE s.branch_id = $1
        AND s.status = 'completed'
        AND s.created_at >= CURRENT_DATE
        AND s.created_at < CURRENT_DATE + INTERVAL '1 day'
      GROUP BY p.product_id, p.name, p.barcode
      ORDER BY quantity_sold DESC, sales_amount DESC
      LIMIT 5
    `, [branchId]),
  ]);

  const payments = Object.fromEntries(
    paymentTotals.rows.map(row => [row.payment_method, row.total]),
  );

  return {
    date: new Date().toISOString().slice(0, 10),
    summary: summary.rows[0],
    payments: {
      cash: payments.cash ?? '0',
      card: payments.card ?? '0',
      bank_transfer: payments.bank_transfer ?? '0',
    },
    low_stock: lowStock.rows,
    best_selling: bestSelling.rows,
  };
}

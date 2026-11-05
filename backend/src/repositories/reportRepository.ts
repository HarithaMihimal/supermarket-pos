import { pool } from '../config/database';
import { ReportQuery } from '../schemas/reportSchema';

const periodsCte = `
  WITH periods AS (
    SELECT generate_series(
      date_trunc($4, $2::date::timestamp),
      date_trunc($4, $3::date::timestamp),
      CASE WHEN $4 = 'month' THEN INTERVAL '1 month' ELSE INTERVAL '1 day' END
    )::date AS period
  )
`;

export async function getManagementReports(branchId: number, query: ReportQuery) {
    const values = [branchId, query.from, query.to, query.group_by];
    const [sales, profit, cashiers, inventory] = await Promise.all([
        pool.query(`
      ${periodsCte},
      sales_by_period AS (
        SELECT date_trunc($4, s.created_at)::date AS period,
               COUNT(*)::int AS transaction_count,
               SUM(s.total_amount) AS gross_sales
        FROM sales s
        WHERE s.branch_id = $1 AND s.status = 'completed'
          AND s.created_at >= $2::date
          AND s.created_at < $3::date + INTERVAL '1 day'
        GROUP BY 1
      ),
      refunds_by_period AS (
        SELECT date_trunc($4, r.created_at)::date AS period,
               SUM(r.refund_amount) AS refunds
        FROM returns r
        WHERE r.branch_id = $1
          AND r.created_at >= $2::date
          AND r.created_at < $3::date + INTERVAL '1 day'
        GROUP BY 1
      )
      SELECT to_char(periods.period, CASE WHEN $4 = 'month' THEN 'YYYY-MM' ELSE 'YYYY-MM-DD' END) AS period,
             COALESCE(sales_by_period.transaction_count, 0)::int AS transaction_count,
             COALESCE(sales_by_period.gross_sales, 0) AS gross_sales,
             COALESCE(refunds_by_period.refunds, 0) AS refunds,
             COALESCE(sales_by_period.gross_sales, 0) - COALESCE(refunds_by_period.refunds, 0) AS net_sales
      FROM periods
      LEFT JOIN sales_by_period USING (period)
      LEFT JOIN refunds_by_period USING (period)
      ORDER BY periods.period
    `, values),
        pool.query(`
      ${periodsCte},
      sales_profit AS (
        SELECT date_trunc($4, s.created_at)::date AS period,
               SUM(si.subtotal - (si.quantity * p.cost_price)) AS gross_profit
        FROM sales s
        JOIN sale_items si ON si.sale_id = s.sale_id
        JOIN products p ON p.product_id = si.product_id
        WHERE s.branch_id = $1 AND s.status = 'completed'
          AND s.created_at >= $2::date
          AND s.created_at < $3::date + INTERVAL '1 day'
        GROUP BY 1
      ),
      refund_profit AS (
        SELECT date_trunc($4, r.created_at)::date AS period,
               SUM(ri.refund_amount - (ri.quantity * p.cost_price)) AS refunded_profit
        FROM returns r
        JOIN return_items ri ON ri.return_id = r.return_id
        JOIN sale_items si ON si.sale_item_id = ri.sale_item_id
        JOIN products p ON p.product_id = si.product_id
        WHERE r.branch_id = $1
          AND r.created_at >= $2::date
          AND r.created_at < $3::date + INTERVAL '1 day'
        GROUP BY 1
      )
      SELECT to_char(periods.period, CASE WHEN $4 = 'month' THEN 'YYYY-MM' ELSE 'YYYY-MM-DD' END) AS period,
             COALESCE(sales_profit.gross_profit, 0) - COALESCE(refund_profit.refunded_profit, 0) AS gross_profit_estimate
      FROM periods
      LEFT JOIN sales_profit USING (period)
      LEFT JOIN refund_profit USING (period)
      ORDER BY periods.period
    `, values),
        pool.query(`
      WITH sales_by_cashier AS (
        SELECT s.cashier_id, COUNT(*)::int AS transaction_count,
               SUM(s.total_amount) AS gross_sales
        FROM sales s
        WHERE s.branch_id = $1 AND s.status = 'completed'
          AND s.created_at >= $2::date
          AND s.created_at < $3::date + INTERVAL '1 day'
        GROUP BY s.cashier_id
      ),
      profit_by_cashier AS (
        SELECT s.cashier_id,
               SUM(si.subtotal - (si.quantity * p.cost_price)) AS gross_profit_estimate
        FROM sales s
        JOIN sale_items si ON si.sale_id = s.sale_id
        JOIN products p ON p.product_id = si.product_id
        WHERE s.branch_id = $1 AND s.status = 'completed'
          AND s.created_at >= $2::date
          AND s.created_at < $3::date + INTERVAL '1 day'
        GROUP BY s.cashier_id
      ),
      refunds_by_cashier AS (
        SELECT s.cashier_id, SUM(r.refund_amount) AS refunds
        FROM returns r
        JOIN sales s ON s.sale_id = r.sale_id
        WHERE s.branch_id = $1
          AND r.created_at >= $2::date
          AND r.created_at < $3::date + INTERVAL '1 day'
        GROUP BY s.cashier_id
      )
      SELECT u.user_id, u.full_name AS cashier,
             sales_by_cashier.transaction_count,
             sales_by_cashier.gross_sales,
             COALESCE(refunds_by_cashier.refunds, 0) AS refunds,
             sales_by_cashier.gross_sales - COALESCE(refunds_by_cashier.refunds, 0) AS net_sales,
             COALESCE(profit_by_cashier.gross_profit_estimate, 0) AS gross_profit_estimate
      FROM sales_by_cashier
      JOIN users u ON u.user_id = sales_by_cashier.cashier_id
      LEFT JOIN profit_by_cashier USING (cashier_id)
      LEFT JOIN refunds_by_cashier USING (cashier_id)
      ORDER BY net_sales DESC, u.full_name
    `, values.slice(0, 3)),
        pool.query(`
      SELECT i.product_id, p.name, p.barcode, i.quantity,
             p.cost_price, p.selling_price,
             i.quantity * p.cost_price AS cost_value,
             i.quantity * p.selling_price AS retail_value
      FROM inventory i
      JOIN products p ON p.product_id = i.product_id
      WHERE i.branch_id = $1
      ORDER BY cost_value DESC, p.name
    `, [branchId]),
    ]);

    const inventoryItems = inventory.rows;
    const totalCostValue = inventoryItems.reduce((total, item) => total + Number(item.cost_value), 0);
    const totalRetailValue = inventoryItems.reduce((total, item) => total + Number(item.retail_value), 0);

    return {
        from: query.from,
        to: query.to,
        group_by: query.group_by,
        sales: sales.rows,
        profit: profit.rows,
        cashiers: cashiers.rows,
        inventory: {
            items: inventoryItems,
            total_cost_value: totalCostValue.toFixed(2),
            total_retail_value: totalRetailValue.toFixed(2),
        },
        profit_basis: 'Estimated using current product costs; historical cost snapshots are not stored.',
        tax_report: {
            available: false,
            message: 'Configure a tax rate and whether prices include tax before calculating tax reports.',
        },
    };
}
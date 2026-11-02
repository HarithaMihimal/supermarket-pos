import { pool } from '../config/database';
import { AuthorizedReturnInput } from '../schemas/returnSchema';
import { AppError } from '../utils/AppError';

export async function getReturnableSale(saleId: number, branchId: number) {
  const result = await pool.query(`
    SELECT s.sale_id, s.branch_id, s.total_amount, s.status, s.created_at,
           u.full_name AS cashier, p.payment_method,
           si.sale_item_id, si.product_id, pr.name, pr.barcode,
           si.quantity AS sold_quantity, si.unit_price, si.subtotal,
           COALESCE(SUM(ri.quantity), 0) AS returned_quantity
    FROM sales s
    JOIN users u ON u.user_id = s.cashier_id
    JOIN payments p ON p.sale_id = s.sale_id
    JOIN sale_items si ON si.sale_id = s.sale_id
    JOIN products pr ON pr.product_id = si.product_id
    LEFT JOIN return_items ri ON ri.sale_item_id = si.sale_item_id
    WHERE s.sale_id = $1 AND s.branch_id = $2
    GROUP BY s.sale_id, u.full_name, p.payment_method, si.sale_item_id,
             si.product_id, pr.name, pr.barcode, si.quantity, si.unit_price, si.subtotal
    ORDER BY si.sale_item_id
  `, [saleId, branchId]);

  if (!result.rowCount) return null;

  const sale = result.rows[0];
  return {
    sale_id: Number(sale.sale_id),
    branch_id: Number(sale.branch_id),
    total_amount: sale.total_amount,
    status: sale.status,
    created_at: sale.created_at,
    cashier: sale.cashier,
    payment_method: sale.payment_method,
    items: result.rows.map(item => ({
      sale_item_id: Number(item.sale_item_id),
      product_id: Number(item.product_id),
      name: item.name,
      barcode: item.barcode,
      sold_quantity: item.sold_quantity,
      returned_quantity: item.returned_quantity,
      returnable_quantity: Math.max(0, Number(item.sold_quantity) - Number(item.returned_quantity)),
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    })),
  };
}

export async function createReturn(data: AuthorizedReturnInput) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const saleResult = await client.query(
      `SELECT sale_id, branch_id, status
       FROM sales
       WHERE sale_id = $1 AND branch_id = $2
       FOR UPDATE`,
      [data.sale_id, data.branch_id],
    );
    if (!saleResult.rowCount || saleResult.rows[0].status !== 'completed') {
      throw new AppError(404, 'Completed sale not found');
    }

    const itemIds = data.items.map(item => item.sale_item_id);
    const itemResult = await client.query(`
      SELECT si.sale_item_id, si.product_id, si.quantity AS sold_quantity,
             si.unit_price, si.subtotal,
             COALESCE(returned.returned_quantity, 0) AS returned_quantity
      FROM sale_items si
      LEFT JOIN (
        SELECT sale_item_id, SUM(quantity) AS returned_quantity
        FROM return_items
        GROUP BY sale_item_id
      ) returned ON returned.sale_item_id = si.sale_item_id
      WHERE si.sale_id = $1 AND si.sale_item_id = ANY($2::bigint[])
      FOR UPDATE OF si
    `, [data.sale_id, itemIds]);

    if (itemResult.rows.length !== new Set(itemIds).size) {
      throw new AppError(400, 'One or more return items do not belong to this receipt');
    }

    const itemMap = new Map(itemResult.rows.map(item => [Number(item.sale_item_id), item]));
    let refundAmount = 0;
    const returnItems = data.items.map(item => {
      const saleItem = itemMap.get(item.sale_item_id);
      if (!saleItem) {
        throw new AppError(400, `Return item ${item.sale_item_id} does not belong to this receipt`);
      }
      const returnable = Number(saleItem.sold_quantity) - Number(saleItem.returned_quantity);
      if (item.quantity > returnable) {
        throw new AppError(400, `Return quantity exceeds the available quantity for item ${item.sale_item_id}`);
      }
      const refund = Math.round(Number(saleItem.unit_price) * item.quantity * 100) / 100;
      refundAmount += refund;
      return { ...item, product_id: Number(saleItem.product_id), refund };
    });

    refundAmount = Math.round(refundAmount * 100) / 100;
    const returnResult = await client.query(
      `INSERT INTO returns (sale_id, branch_id, processed_by, refund_amount, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING return_id, sale_id, refund_amount, reason, created_at`,
      [data.sale_id, data.branch_id, data.processed_by, refundAmount, data.reason],
    );

    for (const item of returnItems) {
      await client.query(
        `INSERT INTO return_items (return_id, sale_item_id, quantity, refund_amount)
         VALUES ($1, $2, $3, $4)`,
        [returnResult.rows[0].return_id, item.sale_item_id, item.quantity, item.refund],
      );
      await client.query(
        `UPDATE inventory SET quantity = quantity + $1
         WHERE branch_id = $2 AND product_id = $3`,
        [item.quantity, data.branch_id, item.product_id],
      );
      await client.query(
        `INSERT INTO inventory_movements
           (branch_id, product_id, quantity_delta, reason, note)
         VALUES ($1, $2, $3, 'adjustment', $4)`,
        [data.branch_id, item.product_id, item.quantity, `Return ${returnResult.rows[0].return_id}`],
      );
    }

    await client.query('COMMIT');
    return { ...returnResult.rows[0], items: returnItems };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

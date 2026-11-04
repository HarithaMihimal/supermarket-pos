import { pool } from '../config/database';
import { AppError } from '../utils/AppError';
import { GoodsReceiptInput, PurchaseOrderInput, SupplierInput } from '../schemas/purchaseSchema';

export async function listSuppliers() {
  const result = await pool.query(
    `SELECT supplier_id, name, contact_name, email, phone, address, active, created_at
     FROM suppliers WHERE active = TRUE ORDER BY name`,
  );
  return result.rows;
}

export async function createSupplier(data: SupplierInput) {
  const result = await pool.query(
    `INSERT INTO suppliers (name, contact_name, email, phone, address)
     VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''))
     RETURNING supplier_id, name, contact_name, email, phone, address, active, created_at`,
    [data.name, data.contact_name ?? '', data.email ?? '', data.phone ?? '', data.address ?? ''],
  );
  return result.rows[0];
}

export async function listPurchaseOrders(branchId: number) {
  const result = await pool.query(`
    SELECT po.purchase_order_id, po.supplier_id, s.name AS supplier_name, po.status,
           po.order_date, po.expected_date, po.notes, po.created_at,
           COALESCE(SUM(poi.ordered_quantity * poi.unit_cost), 0) AS total_cost,
           COALESCE(SUM(poi.ordered_quantity), 0) AS item_quantity,
           COALESCE(SUM(poi.received_quantity), 0) AS received_quantity
    FROM purchase_orders po
    JOIN suppliers s ON s.supplier_id = po.supplier_id
    LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.purchase_order_id
    WHERE po.branch_id = $1
    GROUP BY po.purchase_order_id, s.name
    ORDER BY po.created_at DESC
  `, [branchId]);
  return result.rows;
}

export async function getPurchaseOrder(id: number, branchId: number) {
  const result = await pool.query(`
    SELECT po.purchase_order_id, po.supplier_id, s.name AS supplier_name, po.status,
           po.order_date, po.expected_date, po.notes, po.created_at,
           poi.purchase_order_item_id, poi.product_id, p.name AS product_name,
           p.barcode, poi.ordered_quantity, poi.received_quantity, poi.unit_cost
    FROM purchase_orders po
    JOIN suppliers s ON s.supplier_id = po.supplier_id
    JOIN purchase_order_items poi ON poi.purchase_order_id = po.purchase_order_id
    JOIN products p ON p.product_id = poi.product_id
    WHERE po.purchase_order_id = $1 AND po.branch_id = $2
    ORDER BY poi.purchase_order_item_id
  `, [id, branchId]);
  if (!result.rowCount) return null;
  const first = result.rows[0];
  return {
    purchase_order_id: Number(first.purchase_order_id),
    supplier_id: Number(first.supplier_id),
    supplier_name: first.supplier_name,
    status: first.status,
    order_date: first.order_date,
    expected_date: first.expected_date,
    notes: first.notes,
    created_at: first.created_at,
    items: result.rows.map(item => ({
      purchase_order_item_id: Number(item.purchase_order_item_id),
      product_id: Number(item.product_id),
      product_name: item.product_name,
      barcode: item.barcode,
      ordered_quantity: item.ordered_quantity,
      received_quantity: item.received_quantity,
      remaining_quantity: Number(item.ordered_quantity) - Number(item.received_quantity),
      unit_cost: item.unit_cost,
    })),
  };
}

export async function createPurchaseOrder(data: PurchaseOrderInput, branchId: number, userId: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const order = await client.query(
      `INSERT INTO purchase_orders (branch_id, supplier_id, expected_date, notes, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING purchase_order_id`,
      [branchId, data.supplier_id, data.expected_date ?? null, data.notes ?? null, userId],
    );
    for (const item of data.items) {
      await client.query(
        `INSERT INTO purchase_order_items (purchase_order_id, product_id, ordered_quantity, unit_cost)
         VALUES ($1, $2, $3, $4)`,
        [order.rows[0].purchase_order_id, item.product_id, item.ordered_quantity, item.unit_cost],
      );
    }
    await client.query('COMMIT');
    return getPurchaseOrder(Number(order.rows[0].purchase_order_id), branchId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function receivePurchaseOrder(
  id: number,
  data: GoodsReceiptInput,
  branchId: number,
  userId: number,
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const order = await client.query(
      `SELECT purchase_order_id, status FROM purchase_orders
       WHERE purchase_order_id = $1 AND branch_id = $2 FOR UPDATE`,
      [id, branchId],
    );
    if (!order.rowCount || order.rows[0].status === 'cancelled') {
      throw new AppError(404, 'Open purchase order not found');
    }
    const itemIds = data.items.map(item => item.purchase_order_item_id);
    const items = await client.query(
      `SELECT poi.purchase_order_item_id, poi.product_id, poi.ordered_quantity,
              poi.received_quantity, poi.unit_cost
       FROM purchase_order_items poi
       WHERE poi.purchase_order_id = $1 AND poi.purchase_order_item_id = ANY($2::bigint[])
       FOR UPDATE`,
      [id, itemIds],
    );
    if (items.rows.length !== new Set(itemIds).size) {
      throw new AppError(400, 'One or more receipt items do not belong to this purchase order');
    }
    const itemMap = new Map(items.rows.map(item => [Number(item.purchase_order_item_id), item]));
    const receipt = await client.query(
      `INSERT INTO goods_receipts (purchase_order_id, branch_id, received_by, note)
       VALUES ($1, $2, $3, $4) RETURNING goods_receipt_id, received_at`,
      [id, branchId, userId, data.note ?? null],
    );
    for (const input of data.items) {
      const item = itemMap.get(input.purchase_order_item_id);
      if (!item) throw new AppError(400, 'Invalid receipt item');
      const remaining = Number(item.ordered_quantity) - Number(item.received_quantity);
      if (input.quantity > remaining) {
        throw new AppError(400, `Receipt quantity exceeds remaining quantity for item ${input.purchase_order_item_id}`);
      }
      await client.query(
        `INSERT INTO goods_receipt_items (goods_receipt_id, purchase_order_item_id, quantity)
         VALUES ($1, $2, $3)`,
        [receipt.rows[0].goods_receipt_id, input.purchase_order_item_id, input.quantity],
      );
      await client.query(
        `UPDATE purchase_order_items SET received_quantity = received_quantity + $1
         WHERE purchase_order_item_id = $2`,
        [input.quantity, input.purchase_order_item_id],
      );
      await client.query(
        `INSERT INTO inventory (branch_id, product_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (branch_id, product_id) DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity`,
        [branchId, item.product_id, input.quantity],
      );
      await client.query(
        `INSERT INTO inventory_movements (branch_id, product_id, quantity_delta, reason, note)
         VALUES ($1, $2, $3, 'receipt', $4)`,
        [branchId, item.product_id, input.quantity, `Purchase order ${id}`],
      );
      await client.query(
        `UPDATE products SET cost_price = $1 WHERE product_id = $2`,
        [item.unit_cost, item.product_id],
      );
    }
    const remaining = await client.query(
      `SELECT COALESCE(SUM(ordered_quantity - received_quantity), 0) AS remaining
       FROM purchase_order_items WHERE purchase_order_id = $1`,
      [id],
    );
    await client.query(
      `UPDATE purchase_orders SET status = CASE WHEN $1::NUMERIC = 0 THEN 'received' ELSE 'partially_received' END
       WHERE purchase_order_id = $2`,
      [remaining.rows[0].remaining, id],
    );
    await client.query('COMMIT');
    return { goods_receipt_id: Number(receipt.rows[0].goods_receipt_id), received_at: receipt.rows[0].received_at };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

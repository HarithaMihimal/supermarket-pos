import { pool } from '../config/database';
import { InventoryAdjustmentInput, StockTransferInput } from '../schemas/inventorySchema';
import { AppError } from '../utils/AppError';

export async function listInventory(search?: string, lowStockOnly = false, branchId = 1) {
  const values: (string | number)[] = [branchId];
  const filters = ['i.branch_id = $1', 'p.active = TRUE'];

  if (search) {
    values.push(`%${search}%`);
    filters.push(`(p.name ILIKE $${values.length} OR p.barcode ILIKE $${values.length})`);
  }

  if (lowStockOnly) {
    filters.push('i.quantity <= i.reorder_level');
  }

  const result = await pool.query(`
    SELECT i.inventory_id, i.branch_id, i.product_id, i.quantity, i.reorder_level,
           p.name, p.barcode, p.cost_price, p.selling_price,
           c.category_id, c.name AS category,
           (i.quantity <= i.reorder_level) AS low_stock
    FROM inventory i
    JOIN products p ON p.product_id = i.product_id
    LEFT JOIN categories c ON c.category_id = p.category_id
    WHERE ${filters.join(' AND ')}
    ORDER BY low_stock DESC, p.name
  `, values);

  return result.rows;
}

export async function adjustInventory(data: InventoryAdjustmentInput, branchId: number) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const inventory = await client.query(
      `SELECT i.quantity, p.name
       FROM inventory i
       JOIN products p ON p.product_id = i.product_id
       WHERE i.branch_id = $1 AND i.product_id = $2 AND p.active = TRUE
       FOR UPDATE`,
      [branchId, data.product_id],
    );

    if (!inventory.rowCount) {
      throw new AppError(404, 'Inventory item not found');
    }

    const currentQuantity = Number(inventory.rows[0].quantity);
    const newQuantity = currentQuantity + data.quantity_delta;
    if (newQuantity < 0) {
      throw new AppError(400, `Stock cannot be negative for ${inventory.rows[0].name}`);
    }

    await client.query(
      `UPDATE inventory
       SET quantity = $1
       WHERE branch_id = $2 AND product_id = $3`,
      [newQuantity, branchId, data.product_id],
    );

    const movement = await client.query(
      `INSERT INTO inventory_movements
         (branch_id, product_id, quantity_delta, reason, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING movement_id, branch_id, product_id, quantity_delta, reason, note, created_at`,
      [branchId, data.product_id, data.quantity_delta, data.reason, data.note ?? null],
    );

    await client.query('COMMIT');
    return { ...movement.rows[0], quantity: newQuantity };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listStockTransfers(branchId: number) {
  const result = await pool.query(`
    SELECT t.transfer_id, t.source_branch_id, source.name AS source_branch,
           t.destination_branch_id, destination.name AS destination_branch,
           t.note, t.created_at, u.full_name AS transferred_by,
           COALESCE(json_agg(json_build_object(
             'product_id', i.product_id,
             'product_name', p.name,
             'quantity', i.quantity
           ) ORDER BY p.name) FILTER (WHERE i.transfer_item_id IS NOT NULL), '[]'::json) AS items
    FROM stock_transfers t
    JOIN branches source ON source.branch_id = t.source_branch_id
    JOIN branches destination ON destination.branch_id = t.destination_branch_id
    JOIN users u ON u.user_id = t.transferred_by
    LEFT JOIN stock_transfer_items i ON i.transfer_id = t.transfer_id
    LEFT JOIN products p ON p.product_id = i.product_id
    WHERE t.source_branch_id = $1 OR t.destination_branch_id = $1
    GROUP BY t.transfer_id, source.name, destination.name, u.full_name
    ORDER BY t.created_at DESC
    LIMIT 100
  `, [branchId]);
  return result.rows;
}

export async function createStockTransfer(data: StockTransferInput, sourceBranchId: number, userId: number) {
  const client = await pool.connect();
  const productIds = data.items.map(item => item.product_id).sort((a, b) => a - b);
  try {
    await client.query('BEGIN');
    const destination = await client.query(
      'SELECT branch_id FROM branches WHERE branch_id = $1',
      [data.destination_branch_id],
    );
    if (!destination.rowCount) throw new AppError(404, 'Destination branch not found');
    if (sourceBranchId === data.destination_branch_id) {
      throw new AppError(400, 'Source and destination branches must be different');
    }

    const lockedInventory = await client.query(`
      SELECT i.branch_id, i.product_id, i.quantity, p.name
      FROM inventory i
      JOIN products p ON p.product_id = i.product_id
      WHERE i.branch_id = ANY($1::bigint[])
        AND i.product_id = ANY($2::bigint[])
        AND p.active = TRUE
      ORDER BY i.branch_id, i.product_id
      FOR UPDATE OF i
    `, [[sourceBranchId, data.destination_branch_id], productIds]);

    const inventoryByBranchAndProduct = new Map(
      lockedInventory.rows.map(row => [`${row.branch_id}:${row.product_id}`, row]),
    );
    for (const productId of productIds) {
      const sourceStock = inventoryByBranchAndProduct.get(`${sourceBranchId}:${productId}`);
      const destinationStock = inventoryByBranchAndProduct.get(`${data.destination_branch_id}:${productId}`);
      if (!sourceStock || !destinationStock) {
        throw new AppError(400, 'One or more products are unavailable at both branches');
      }
      const requestedQuantity = data.items.find(item => item.product_id === productId)?.quantity;
      if (requestedQuantity === undefined || Number(sourceStock.quantity) < requestedQuantity) {
        throw new AppError(400, `Insufficient stock for ${sourceStock.name}`);
      }
    }

    const transfer = await client.query(`
      INSERT INTO stock_transfers (source_branch_id, destination_branch_id, transferred_by, note)
      VALUES ($1, $2, $3, $4)
      RETURNING transfer_id, source_branch_id, destination_branch_id, note, created_at
    `, [sourceBranchId, data.destination_branch_id, userId, data.note ?? null]);

    for (const item of data.items) {
      await client.query(
        `INSERT INTO stock_transfer_items (transfer_id, product_id, quantity)
         VALUES ($1, $2, $3)`,
        [transfer.rows[0].transfer_id, item.product_id, item.quantity],
      );
      await client.query(
        `UPDATE inventory SET quantity = quantity - $1
         WHERE branch_id = $2 AND product_id = $3`,
        [item.quantity, sourceBranchId, item.product_id],
      );
      await client.query(
        `UPDATE inventory SET quantity = quantity + $1
         WHERE branch_id = $2 AND product_id = $3`,
        [item.quantity, data.destination_branch_id, item.product_id],
      );
      await client.query(
        `INSERT INTO inventory_movements (branch_id, product_id, quantity_delta, reason, note)
         VALUES ($1, $2, $3, 'transfer_out', $4), ($5, $2, $6, 'transfer_in', $4)`,
        [
          sourceBranchId, item.product_id, -item.quantity, `Transfer ${transfer.rows[0].transfer_id}`,
          data.destination_branch_id, item.quantity,
        ],
      );
    }

    await client.query('COMMIT');
    return {
      ...transfer.rows[0],
      items: data.items.map(item => ({
        ...item,
        product_name: inventoryByBranchAndProduct.get(`${sourceBranchId}:${item.product_id}`).name,
      })),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

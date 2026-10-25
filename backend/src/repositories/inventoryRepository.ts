import { pool } from '../config/database';
import { InventoryAdjustmentInput } from '../schemas/inventorySchema';
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

export async function adjustInventory(data: InventoryAdjustmentInput) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const inventory = await client.query(
      `SELECT i.quantity, p.name
       FROM inventory i
       JOIN products p ON p.product_id = i.product_id
       WHERE i.branch_id = $1 AND i.product_id = $2 AND p.active = TRUE
       FOR UPDATE`,
      [data.branch_id, data.product_id],
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
      [newQuantity, data.branch_id, data.product_id],
    );

    const movement = await client.query(
      `INSERT INTO inventory_movements
         (branch_id, product_id, quantity_delta, reason, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING movement_id, branch_id, product_id, quantity_delta, reason, note, created_at`,
      [data.branch_id, data.product_id, data.quantity_delta, data.reason, data.note ?? null],
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

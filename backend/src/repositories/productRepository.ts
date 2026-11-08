import { pool } from '../config/database';
import { CategoryInput, ProductInput } from '../schemas/productSchema';
import { ProductImportRow } from '../schemas/productImportSchema';

export async function listProducts(branchId: number, search?: string, categoryId?: number) {
  const values: (string | number)[] = [branchId];
  const filters = ['p.active = TRUE'];

  if (search) {
    values.push(`%${search}%`);
    filters.push(`(p.name ILIKE $${values.length} OR p.barcode ILIKE $${values.length})`);
  }

  if (categoryId) {
    values.push(categoryId);
    filters.push(`p.category_id = $${values.length}`);
  }

  const result = await pool.query(`
    SELECT p.product_id, p.name, p.barcode, p.cost_price, p.selling_price, p.is_new,
           c.category_id, c.name AS category, COALESCE(i.quantity, 0) AS quantity
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.category_id
    LEFT JOIN inventory i ON p.product_id = i.product_id AND i.branch_id = $1
    WHERE ${filters.join(' AND ')}
    ORDER BY p.name
  `, values);

  return result.rows;
}

export async function listCategories() {
  const result = await pool.query(
    'SELECT category_id, name FROM categories ORDER BY name'
  );
  return result.rows;
}

export async function createCategory(data: CategoryInput) {
  const result = await pool.query(
    'INSERT INTO categories (name) VALUES ($1) RETURNING category_id, name',
    [data.name],
  );
  return result.rows[0];
}

export async function updateCategory(id: number, data: CategoryInput) {
  const result = await pool.query(
    'UPDATE categories SET name = $1 WHERE category_id = $2 RETURNING category_id, name',
    [data.name, id],
  );
  return result.rows[0] ?? null;
}

export async function createProduct(data: ProductInput, branchId: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
      INSERT INTO products
        (name, barcode, category_id, cost_price, selling_price, active, is_new)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE)
      RETURNING *;
    `, [
      data.name, data.barcode, data.category_id, data.cost_price,
      data.selling_price, data.active,
    ]);
    await client.query(
      `INSERT INTO inventory (branch_id, product_id, quantity, reorder_level)
       SELECT branch_id, $1, CASE WHEN branch_id = $2 THEN $3 ELSE 0 END, $4
       FROM branches
       ON CONFLICT (branch_id, product_id) DO NOTHING`,
      [result.rows[0].product_id, branchId, data.initial_quantity, data.reorder_level],
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

}

export async function importProducts(rows: ProductImportRow[], branchId: number, importedBy?: number, fileName?: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const batch = await client.query(
      `INSERT INTO product_import_batches (branch_id, imported_by, file_name, row_count)
       VALUES ($1, $2, $3, $4)
       RETURNING import_batch_id`,
      [branchId, importedBy ?? null, fileName ?? null, rows.length],
    );
    const imported = [];
    const priceChanges = [];
    const deactivatedProducts = [];

    for (const row of rows) {
      const previousProduct = await client.query(
        `SELECT product_id, cost_price, selling_price, active
         FROM products WHERE barcode = $1 FOR UPDATE`,
        [row.barcode],
      );
      const category = await client.query(
        `INSERT INTO categories (name) VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING category_id`,
        [row.category],
      );
      const product = await client.query(`
        INSERT INTO products
          (name, barcode, category_id, cost_price, selling_price, active, is_new)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE)
        ON CONFLICT (barcode) DO UPDATE SET
          name = EXCLUDED.name,
          category_id = EXCLUDED.category_id,
          cost_price = EXCLUDED.cost_price,
          selling_price = EXCLUDED.selling_price,
          active = EXCLUDED.active
        RETURNING product_id, name, barcode
      `, [
        row.name, row.barcode, category.rows[0].category_id,
        row.cost_price, row.selling_price, row.active,
      ]);
      await client.query(
        `INSERT INTO inventory (branch_id, product_id, quantity, reorder_level)
         SELECT branch_id, $1, CASE WHEN branch_id = $2 THEN $3 ELSE 0 END, $4
         FROM branches
         ON CONFLICT (branch_id, product_id) DO UPDATE SET
           quantity = CASE WHEN inventory.branch_id = $2 THEN EXCLUDED.quantity ELSE inventory.quantity END,
           reorder_level = EXCLUDED.reorder_level`,
        [product.rows[0].product_id, branchId, row.initial_quantity, row.reorder_level],
      );
      imported.push(product.rows[0]);

      if (previousProduct.rowCount) {
        const previous = previousProduct.rows[0];
        if (Number(previous.cost_price) !== row.cost_price
          || Number(previous.selling_price) !== row.selling_price) {
          priceChanges.push({
            product_id: Number(previous.product_id),
            name: row.name,
            previous_cost_price: Number(previous.cost_price),
            new_cost_price: row.cost_price,
            previous_selling_price: Number(previous.selling_price),
            new_selling_price: row.selling_price,
          });
        }
      }

      if (previousProduct.rowCount && previousProduct.rows[0].active && !row.active) {
        deactivatedProducts.push({ product_id: Number(previousProduct.rows[0].product_id), name: row.name });
      }
    }

    await client.query('COMMIT');
    return { batchId: batch.rows[0].import_batch_id, products: imported, priceChanges, deactivatedProducts };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function removeProduct(id: number) {
  const result = await pool.query(
    `UPDATE products
     SET active = FALSE
     WHERE product_id = $1
     RETURNING product_id, name`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function updateProduct(
  id: number,
  data: ProductInput
) {
  const query = `
    WITH previous AS (
      SELECT cost_price, selling_price, active
      FROM products
      WHERE product_id = $7
      FOR UPDATE
    )
    UPDATE products
    SET
      name = $1,
      barcode = $2,
      category_id = $3,
      cost_price = $4,
      selling_price = $5,
      active = $6
    WHERE product_id = $7
    RETURNING *,
      (SELECT cost_price FROM previous) AS previous_cost_price,
      (SELECT selling_price FROM previous) AS previous_selling_price,
      (SELECT active FROM previous) AS previous_active;
  `;

  const values = [
    data.name,
    data.barcode,
    data.category_id,
    data.cost_price,
    data.selling_price,
    data.active,
    id,
  ];

  const result = await pool.query(query, values);
  return result.rows[0] ?? null;
}
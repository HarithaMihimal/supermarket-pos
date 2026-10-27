import { pool } from '../config/database';
import { CategoryInput, ProductInput } from '../schemas/productSchema';

export async function listProducts(search?: string, categoryId?: number) {
  const values: (string | number)[] = [];
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
    SELECT p.product_id, p.name, p.barcode, p.selling_price,
           c.category_id, c.name AS category, COALESCE(i.quantity, 0) AS quantity
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.category_id
    LEFT JOIN inventory i ON p.product_id = i.product_id AND i.branch_id = 1
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

export async function createProduct(data: ProductInput) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
      INSERT INTO products
        (name, barcode, category_id, cost_price, selling_price, active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `, [
      data.name, data.barcode, data.category_id, data.cost_price,
      data.selling_price, data.active,
    ]);
    await client.query(
      `INSERT INTO inventory (branch_id, product_id, quantity)
       VALUES (1, $1, 0)`,
      [result.rows[0].product_id],
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

export async function updateProduct(
  id: number,
  data: ProductInput
) {
  const query = `
    UPDATE products
    SET
      name = $1,
      barcode = $2,
      category_id = $3,
      cost_price = $4,
      selling_price = $5,
      active = $6
    WHERE product_id = $7
    RETURNING *;
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
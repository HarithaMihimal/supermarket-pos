import { pool } from '../config/database';
import { ProductInput } from '../schemas/productSchema';

export async function createProduct(data: ProductInput) {
  const query = `
    INSERT INTO products
      (name, barcode, category_id,
       cost_price, selling_price, active)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

  const values = [
    data.name,
    data.barcode,
    data.category_id,
    data.cost_price,
    data.selling_price,
    data.active,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
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
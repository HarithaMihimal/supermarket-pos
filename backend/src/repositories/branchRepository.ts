import { pool } from '../config/database';
import type { BranchInput, BranchUserInput } from '../schemas/branchSchema';

export async function listBranches() {
  const result = await pool.query(`
    SELECT branch_id, name, address
    FROM branches
    ORDER BY name
  `);
  return result.rows;
}

export async function createBranch(data: BranchInput) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
      INSERT INTO branches (name, address)
      VALUES ($1, $2)
      RETURNING branch_id, name, address
    `, [data.name, data.address ?? null]);
    await client.query(`
      INSERT INTO inventory (branch_id, product_id, quantity)
      SELECT $1, product_id, 0
      FROM products
      ON CONFLICT (branch_id, product_id) DO NOTHING
    `, [result.rows[0].branch_id]);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listBranchUsers(branchId: number) {
  const result = await pool.query(`
    SELECT u.user_id, u.branch_id, b.name AS branch_name, u.full_name, u.email, u.role, u.created_at
    FROM users u
    JOIN branches b ON b.branch_id = u.branch_id
    WHERE u.branch_id = $1
    ORDER BY u.full_name
  `, [branchId]);
  return result.rows;
}

export async function createBranchUser(branchId: number, data: BranchUserInput, passwordHash: string) {
  const result = await pool.query(`
    INSERT INTO users (branch_id, full_name, email, password_hash, role)
    SELECT b.branch_id, $2, lower($3), $4, $5
    FROM branches b
    WHERE b.branch_id = $1
    RETURNING user_id, branch_id, full_name, email, role, created_at
  `, [branchId, data.full_name, data.email, passwordHash, data.role]);
  return result.rows[0] ?? null;
}

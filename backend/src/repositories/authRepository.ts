import { pool } from '../config/database';
import type { SignupInput } from '../schemas/authSchema';

export async function findUserByEmail(email: string) {
  const result = await pool.query(
    `SELECT user_id, branch_id, full_name, email, password_hash, role
     FROM users WHERE lower(email) = lower($1)`,
    [email],
  );
  return result.rows[0] ?? null;
}

export async function createUser(data: SignupInput, passwordHash: string) {
  const result = await pool.query(
    `INSERT INTO users (branch_id, full_name, email, password_hash, role)
     VALUES ($1, $2, lower($3), $4, 'cashier')
     RETURNING user_id, branch_id, full_name, email, role`,
    [1, data.full_name, data.email, passwordHash],
  );
  return result.rows[0];
}

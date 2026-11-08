import { pool } from '../config/database';
import type { SignupInput } from '../schemas/authSchema';

export async function findUserByEmail(email: string) {
  const result = await pool.query(
    `SELECT u.user_id, u.branch_id, b.name AS branch_name, u.full_name, u.email, u.password_hash, u.role
     FROM users u
     JOIN branches b ON b.branch_id = u.branch_id
     WHERE lower(u.email) = lower($1)`,
    [email],
  );
  return result.rows[0] ?? null;
}

export async function createUser(data: SignupInput, passwordHash: string) {
  const result = await pool.query(
    `INSERT INTO users (branch_id, full_name, email, password_hash, role)
     VALUES ((SELECT branch_id FROM branches ORDER BY branch_id LIMIT 1), $1, lower($2), $3, 'cashier')
     RETURNING user_id, branch_id, full_name, email, role,
       (SELECT name FROM branches WHERE branch_id = users.branch_id) AS branch_name`,
    [data.full_name, data.email, passwordHash],
  );
  return result.rows[0];
}

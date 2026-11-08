import { pool } from '../config/database';
import { SettingsInput } from '../schemas/settingsSchema';

const settingsFields = `
  branch_id, name, address, phone, email, tax_id, currency,
  receipt_footer, default_reorder_level
`;

export async function getSettings(branchId: number) {
  const result = await pool.query(`
    SELECT ${settingsFields}
    FROM branches
    WHERE branch_id = $1
  `, [branchId]);
  return result.rows[0] ?? null;
}

export async function updateSettings(data: SettingsInput, branchId: number) {
  const result = await pool.query(`
    UPDATE branches
    SET name = $1,
        address = $2,
        phone = $3,
        email = $4,
        tax_id = $5,
        currency = $6,
        receipt_footer = $7,
        default_reorder_level = $8
    WHERE branch_id = $9
    RETURNING ${settingsFields}
  `, [
    data.name,
    data.address,
    data.phone,
    data.email,
    data.tax_id,
    data.currency,
    data.receipt_footer,
    data.default_reorder_level,
    branchId,
  ]);
  return result.rows[0] ?? null;
}

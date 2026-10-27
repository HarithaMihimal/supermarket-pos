import { pool } from '../config/database';
import type { Request } from 'express';

export async function writeAudit(
  req: Request,
  action: string,
  entityType?: string,
  entityId?: string | number,
  details: Record<string, unknown> = {},
) {
  await pool.query(
    `INSERT INTO audit_logs
      (user_id, branch_id, action, entity_type, entity_id, details, request_id)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
    [
      req.user?.userId ?? null,
      req.user?.branchId ?? null,
      action,
      entityType ?? null,
      entityId === undefined ? null : String(entityId),
      JSON.stringify(details),
      req.requestId ?? null,
    ],
  );
}

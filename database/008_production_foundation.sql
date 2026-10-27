BEGIN;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(150);

CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id),
    branch_id BIGINT REFERENCES branches(branch_id),
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(80),
    entity_id VARCHAR(80),
    details JSONB NOT NULL DEFAULT '{}'::JSONB,
    request_id VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_branch_date
  ON audit_logs(branch_id, created_at DESC);

COMMIT;

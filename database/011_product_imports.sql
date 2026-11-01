CREATE TABLE IF NOT EXISTS product_import_batches (
    import_batch_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    branch_id BIGINT NOT NULL REFERENCES branches(branch_id),
    imported_by BIGINT REFERENCES users(user_id),
    file_name VARCHAR(255),
    row_count INTEGER NOT NULL CHECK (row_count > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_import_batches_branch_date
  ON product_import_batches(branch_id, created_at DESC);

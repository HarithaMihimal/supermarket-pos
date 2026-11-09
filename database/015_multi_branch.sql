BEGIN;

UPDATE users
SET branch_id = (SELECT branch_id FROM branches ORDER BY branch_id LIMIT 1)
WHERE branch_id IS NULL;

ALTER TABLE users
  ALTER COLUMN branch_id SET NOT NULL;

INSERT INTO inventory (branch_id, product_id, quantity, reorder_level)
SELECT b.branch_id, p.product_id, 0, b.default_reorder_level
FROM branches b
CROSS JOIN products p
ON CONFLICT (branch_id, product_id) DO NOTHING;

ALTER TABLE inventory_movements
  DROP CONSTRAINT IF EXISTS inventory_movements_reason_check;

ALTER TABLE inventory_movements
  ADD CONSTRAINT inventory_movements_reason_check
  CHECK (reason IN ('receipt', 'adjustment', 'damage', 'sale', 'opening_balance', 'transfer_in', 'transfer_out'));

CREATE TABLE stock_transfers (
  transfer_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_branch_id BIGINT NOT NULL REFERENCES branches(branch_id),
  destination_branch_id BIGINT NOT NULL REFERENCES branches(branch_id),
  transferred_by BIGINT NOT NULL REFERENCES users(user_id),
  note VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (source_branch_id <> destination_branch_id)
);

CREATE TABLE stock_transfer_items (
  transfer_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transfer_id BIGINT NOT NULL REFERENCES stock_transfers(transfer_id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(product_id),
  quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  UNIQUE (transfer_id, product_id)
);

CREATE INDEX idx_stock_transfers_source_date
  ON stock_transfers(source_branch_id, created_at DESC);
CREATE INDEX idx_stock_transfers_destination_date
  ON stock_transfers(destination_branch_id, created_at DESC);

COMMIT;

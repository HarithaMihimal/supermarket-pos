BEGIN;

CREATE TABLE IF NOT EXISTS returns (
    return_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sale_id BIGINT NOT NULL REFERENCES sales(sale_id),
    branch_id BIGINT NOT NULL REFERENCES branches(branch_id),
    processed_by BIGINT NOT NULL REFERENCES users(user_id),
    refund_amount NUMERIC(12,2) NOT NULL CHECK (refund_amount > 0),
    refund_method VARCHAR(20) NOT NULL
      CHECK (refund_method IN ('cash', 'card', 'bank_transfer')),
    reason VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS return_items (
    return_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    return_id BIGINT NOT NULL REFERENCES returns(return_id),
    sale_item_id BIGINT NOT NULL REFERENCES sale_items(sale_item_id),
    quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
    refund_amount NUMERIC(12,2) NOT NULL CHECK (refund_amount > 0),
    UNIQUE (return_id, sale_item_id)
);

CREATE INDEX IF NOT EXISTS idx_returns_sale ON returns(sale_id, created_at DESC);

COMMIT;

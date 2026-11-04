BEGIN;

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    contact_name VARCHAR(150),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    purchase_order_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    branch_id BIGINT NOT NULL REFERENCES branches(branch_id),
    supplier_id BIGINT NOT NULL REFERENCES suppliers(supplier_id),
    status VARCHAR(30) NOT NULL DEFAULT 'ordered'
      CHECK (status IN ('ordered', 'partially_received', 'received', 'cancelled')),
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_date DATE,
    notes VARCHAR(500),
    created_by BIGINT NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    purchase_order_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    purchase_order_id BIGINT NOT NULL REFERENCES purchase_orders(purchase_order_id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(product_id),
    ordered_quantity NUMERIC(12,3) NOT NULL CHECK (ordered_quantity > 0),
    received_quantity NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
    unit_cost NUMERIC(12,2) NOT NULL CHECK (unit_cost >= 0),
    UNIQUE (purchase_order_id, product_id),
    CHECK (received_quantity <= ordered_quantity)
);

CREATE TABLE IF NOT EXISTS goods_receipts (
    goods_receipt_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    purchase_order_id BIGINT NOT NULL REFERENCES purchase_orders(purchase_order_id),
    branch_id BIGINT NOT NULL REFERENCES branches(branch_id),
    received_by BIGINT NOT NULL REFERENCES users(user_id),
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    note VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS goods_receipt_items (
    goods_receipt_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    goods_receipt_id BIGINT NOT NULL REFERENCES goods_receipts(goods_receipt_id) ON DELETE CASCADE,
    purchase_order_item_id BIGINT NOT NULL REFERENCES purchase_order_items(purchase_order_item_id),
    quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_branch_date
  ON purchase_orders(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_po
  ON goods_receipts(purchase_order_id, received_at DESC);

COMMIT;

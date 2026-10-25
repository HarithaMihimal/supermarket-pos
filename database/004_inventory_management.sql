ALTER TABLE inventory
  ADD CONSTRAINT inventory_reorder_level_nonnegative CHECK (reorder_level >= 0);

CREATE TABLE inventory_movements (
    movement_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    branch_id BIGINT NOT NULL REFERENCES branches(branch_id),
    product_id BIGINT NOT NULL REFERENCES products(product_id),
    quantity_delta NUMERIC(12,3) NOT NULL CHECK (quantity_delta <> 0),
    reason VARCHAR(30) NOT NULL
        CHECK (reason IN ('receipt', 'adjustment', 'damage', 'sale', 'opening_balance')),
    note VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_branch_stock
  ON inventory(branch_id, quantity, reorder_level);
CREATE INDEX idx_inventory_movements_product_date
  ON inventory_movements(branch_id, product_id, created_at DESC);

INSERT INTO categories (name)
VALUES ('Personal Care')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products
  (category_id, barcode, name, cost_price, selling_price)
SELECT c.category_id, seed.barcode, seed.name, seed.cost_price, seed.selling_price
FROM (
  VALUES
    ('10000006', 'Toothpaste 120g', 240.00::NUMERIC, 310.00::NUMERIC),
    ('10000007', 'Hand Soap 250ml', 150.00::NUMERIC, 210.00::NUMERIC)
) AS seed(barcode, name, cost_price, selling_price)
CROSS JOIN categories c
WHERE c.name = 'Personal Care'
ON CONFLICT (barcode) DO NOTHING;

INSERT INTO inventory (branch_id, product_id, quantity, reorder_level)
SELECT b.branch_id, p.product_id, seed.quantity, seed.reorder_level
FROM (
  VALUES
    ('10000001', 100.000::NUMERIC, 20.000::NUMERIC),
    ('10000002', 75.000::NUMERIC, 15.000::NUMERIC),
    ('10000003', 60.000::NUMERIC, 12.000::NUMERIC),
    ('10000004', 120.000::NUMERIC, 25.000::NUMERIC),
    ('10000005', 50.000::NUMERIC, 10.000::NUMERIC),
    ('10000006', 80.000::NUMERIC, 15.000::NUMERIC),
    ('10000007', 90.000::NUMERIC, 20.000::NUMERIC)
) AS seed(barcode, quantity, reorder_level)
JOIN products p ON p.barcode = seed.barcode
JOIN branches b ON b.name = 'Main Branch'
ON CONFLICT (branch_id, product_id)
DO UPDATE SET reorder_level = EXCLUDED.reorder_level;

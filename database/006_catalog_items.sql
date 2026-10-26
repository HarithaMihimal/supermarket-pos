BEGIN;

INSERT INTO branches (name, address)
SELECT 'Main Branch', 'Colombo, Sri Lanka'
WHERE NOT EXISTS (
  SELECT 1 FROM branches WHERE name = 'Main Branch'
);

INSERT INTO categories (name)
VALUES
  ('Rice & Grains'),
  ('Dairy Products'),
  ('Beverages'),
  ('Snacks'),
  ('Household Items'),
  ('Personal Care')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products
  (category_id, barcode, name, cost_price, selling_price, active)
SELECT c.category_id, catalog.barcode, catalog.name,
       catalog.cost_price, catalog.selling_price, TRUE
FROM (
  VALUES
    ('Rice & Grains', '10000001', 'Rice 1kg', 200.00::NUMERIC, 250.00::NUMERIC),
    ('Dairy Products', '10000002', 'Fresh Milk 1L', 350.00::NUMERIC, 420.00::NUMERIC),
    ('Beverages', '10000003', 'Orange Juice 1L', 400.00::NUMERIC, 500.00::NUMERIC),
    ('Snacks', '10000004', 'Chocolate Biscuits', 120.00::NUMERIC, 160.00::NUMERIC),
    ('Household Items', '10000005', 'Dishwashing Liquid', 280.00::NUMERIC, 350.00::NUMERIC),
    ('Household Items', '10000006', 'Premium Coconut Oil 1L', 700.00::NUMERIC, 850.00::NUMERIC),
    ('Personal Care', '10000007', 'Hand Soap 250ml', 150.00::NUMERIC, 210.00::NUMERIC)
) AS catalog(category_name, barcode, name, cost_price, selling_price)
JOIN categories c ON c.name = catalog.category_name
ON CONFLICT (barcode) DO UPDATE
SET category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    cost_price = EXCLUDED.cost_price,
    selling_price = EXCLUDED.selling_price,
    active = TRUE;

INSERT INTO inventory (branch_id, product_id, quantity, reorder_level)
SELECT b.branch_id, p.product_id, catalog.quantity, catalog.reorder_level
FROM (
  VALUES
    ('10000001', 100.000::NUMERIC, 20.000::NUMERIC),
    ('10000002', 75.000::NUMERIC, 15.000::NUMERIC),
    ('10000003', 60.000::NUMERIC, 12.000::NUMERIC),
    ('10000004', 120.000::NUMERIC, 25.000::NUMERIC),
    ('10000005', 50.000::NUMERIC, 10.000::NUMERIC),
    ('10000006', 80.000::NUMERIC, 15.000::NUMERIC),
    ('10000007', 90.000::NUMERIC, 20.000::NUMERIC)
) AS catalog(barcode, quantity, reorder_level)
JOIN products p ON p.barcode = catalog.barcode
JOIN branches b ON b.name = 'Main Branch'
ON CONFLICT (branch_id, product_id)
DO UPDATE SET reorder_level = EXCLUDED.reorder_level;

COMMIT;

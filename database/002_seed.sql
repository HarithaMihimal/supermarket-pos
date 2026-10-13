INSERT INTO branches (name, address)
VALUES ('Main Branch', 'Colombo, Sri Lanka');

INSERT INTO categories (name)
VALUES
('Rice & Grains'),
('Dairy Products'),
('Beverages'),
('Snacks'),
('Household Items');

INSERT INTO products
(category_id, barcode, name, cost_price, selling_price)
VALUES
(1, '10000001', 'Rice 1kg', 200, 250),
(2, '10000002', 'Fresh Milk 1L', 350, 420),
(3, '10000003', 'Orange Juice 1L', 400, 500),
(4, '10000004', 'Chocolate Biscuits', 120, 160),
(5, '10000005', 'Dishwashing Liquid', 280, 350);

INSERT INTO inventory (branch_id, product_id, quantity)
SELECT 1, product_id, 100
FROM products;
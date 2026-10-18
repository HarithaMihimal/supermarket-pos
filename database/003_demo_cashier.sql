INSERT INTO users (branch_id, full_name, email, password_hash, role)
VALUES (
  1,
  'Demo Cashier',
  'cashier@supermarket.local',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'cashier'
)
ON CONFLICT (email) DO NOTHING;

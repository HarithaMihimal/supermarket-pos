BEGIN;

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS phone VARCHAR(40),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS tax_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'LKR',
  ADD COLUMN IF NOT EXISTS receipt_footer VARCHAR(255) NOT NULL DEFAULT 'Thank you for shopping with us!',
  ADD COLUMN IF NOT EXISTS default_reorder_level NUMERIC(12,3) NOT NULL DEFAULT 10
    CHECK (default_reorder_level >= 0);

UPDATE branches
SET phone = COALESCE(phone, ''),
    email = COALESCE(email, ''),
    tax_id = COALESCE(tax_id, '')
WHERE name = 'Main Branch';

COMMIT;

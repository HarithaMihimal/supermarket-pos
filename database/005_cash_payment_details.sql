ALTER TABLE payments
  ADD COLUMN change_amount NUMERIC(12,2) NOT NULL DEFAULT 0
    CHECK (change_amount >= 0);

CREATE INDEX idx_payments_method_date
  ON payments(payment_method, created_at DESC);

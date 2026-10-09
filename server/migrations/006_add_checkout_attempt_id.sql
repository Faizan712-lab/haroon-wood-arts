ALTER TABLE orders
  ADD COLUMN checkout_attempt_id VARCHAR(64) NULL AFTER payment_resume_expires_at;

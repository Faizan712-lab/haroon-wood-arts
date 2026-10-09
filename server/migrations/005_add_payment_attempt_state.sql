ALTER TABLE orders
  ADD COLUMN payment_attempt_state VARCHAR(32) NOT NULL DEFAULT 'checkout_active' AFTER razorpay_payment_type,
  ADD COLUMN payment_resume_expires_at DATETIME NULL AFTER payment_attempt_state,
  ADD INDEX idx_orders_payment_resume (status, payment_attempt_state, payment_resume_expires_at);

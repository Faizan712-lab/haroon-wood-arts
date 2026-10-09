ALTER TABLE orders
  ADD COLUMN checkout_session_id VARCHAR(64) NULL AFTER checkout_attempt_id,
  ADD UNIQUE INDEX idx_orders_user_checkout_session (user_id, checkout_session_id);

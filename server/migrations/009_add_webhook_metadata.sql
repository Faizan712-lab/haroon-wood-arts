ALTER TABLE orders
  ADD COLUMN razorpay_webhook_event_id VARCHAR(100) NULL AFTER razorpay_signature;

CREATE INDEX idx_orders_webhook_event_id ON orders(razorpay_webhook_event_id);


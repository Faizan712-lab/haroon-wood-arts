ALTER TABLE orders
  ADD COLUMN razorpay_order_id VARCHAR(100) NULL AFTER payment_mode,
  ADD INDEX idx_orders_razorpay_order_id (razorpay_order_id);

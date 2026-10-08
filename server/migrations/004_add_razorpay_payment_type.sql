ALTER TABLE orders
  ADD COLUMN razorpay_payment_type VARCHAR(20) NULL AFTER razorpay_order_id;


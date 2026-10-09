ALTER TABLE orders
  ADD COLUMN razorpay_payment_id VARCHAR(100) NULL AFTER razorpay_payment_type,
  ADD COLUMN razorpay_signature VARCHAR(255) NULL AFTER razorpay_payment_id;


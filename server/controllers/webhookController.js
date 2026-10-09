const crypto = require("crypto");
const db = require("../config/db");
const {
  getOrderWithItems,
  notifyOrderCreated,
  isPaymentPendingOrder,
  codPaymentBreakdown
} = require("./orderController");

async function handleRazorpayWebhook(req, res) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("RAZORPAY_WEBHOOK_SECRET is not configured");
    return res.status(500).send("Webhook secret not configured");
  }

  const signature = req.headers["x-razorpay-signature"];
  if (!signature) {
    return res.status(400).send("Missing signature");
  }

  const rawBody = req.rawBody;
  if (!rawBody) {
    return res.status(400).send("Missing raw body");
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  if (
    expectedSignature.length !== signature.length ||
    !crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
  ) {
    console.error("Invalid Razorpay webhook signature");
    return res.status(400).send("Invalid signature");
  }

  const event = req.body;
  const eventId = req.headers["x-razorpay-event-id"];

  if (!eventId || typeof eventId !== "string" || !eventId.trim()) {
    console.error("Missing or blank x-razorpay-event-id");
    return res.status(400).send("Missing event ID");
  }

  try {
    if (event.event === "payment.captured") {
      await processPaymentCaptured(event.payload.payment.entity, eventId);
    } else if (event.event === "payment.failed") {
      console.log(`Razorpay payment failed webhook received: ${event.payload.payment.entity.id}`);
      // Do not expire the order immediately to preserve the 5-minute resume window.
    }
    res.status(200).send("OK");
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).send("Internal Server Error");
  }
}

async function processPaymentCaptured(payment, eventId) {
  const razorpay_order_id = payment.order_id;
  const razorpay_payment_id = payment.id;
  
  if (!razorpay_order_id) {
    console.log(`Webhook payment captured without order_id: ${razorpay_payment_id}`);
    return;
  }

  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [orders] = await connection.execute(
      `SELECT * FROM orders
       WHERE razorpay_order_id = ?
       LIMIT 1
       FOR UPDATE`,
      [razorpay_order_id]
    );
    const order = orders[0];

    if (!order) {
      console.log(`Webhook: Order not found for Razorpay order ID ${razorpay_order_id}`);
      await connection.rollback();
      return;
    }

    // Check for idempotency: if already processed by this webhook event
    if (order.razorpay_webhook_event_id === eventId) {
      console.log(`Webhook: Event ${eventId} already processed for order ${order.id}`);
      await connection.rollback();
      return;
    }

    // Check for idempotency: if already verified by frontend or a different webhook event
    if (order.status === "Processing" && order.payment_attempt_state === "verified") {
      if (order.razorpay_payment_id === razorpay_payment_id) {
        console.log(`Webhook: Payment already verified by frontend for order ${order.id}`);
        // Safely record this event ID to avoid further processing
        await connection.execute(
          `UPDATE orders SET razorpay_webhook_event_id = ? WHERE id = ?`,
          [eventId, order.id]
        );
        await connection.commit();
        return;
      } else {
        console.log(`Webhook: Order ${order.id} is already verified with a DIFFERENT payment ID (${order.razorpay_payment_id}). Rejecting/ignoring webhook for ${razorpay_payment_id}.`);
        await connection.rollback();
        return;
      }
    }

    if (!isPaymentPendingOrder(order)) {
      console.log(`Webhook: Order ${order.id} is not pending payment.`);
      await connection.rollback();
      return;
    }

    const isCod = order.payment_mode === "COD";
    const total = Number(order.total_amount);

    let paidAmount, remainingAmount;
    if (isCod) {
      const breakdown = codPaymentBreakdown(total);
      paidAmount = breakdown.advance;
      remainingAmount = breakdown.remainingOnDelivery;
    } else {
      paidAmount = total;
      remainingAmount = 0;
    }

    const expectedAmountPaise = Math.round(paidAmount * 100);

    if (payment.currency !== "INR") {
      console.error(`Webhook: Invalid currency ${payment.currency} for order ${order.id}`);
      await connection.rollback();
      return;
    }

    if (payment.amount !== expectedAmountPaise) {
      console.error(`Webhook: Amount mismatch for order ${order.id}. Expected ${expectedAmountPaise}, got ${payment.amount}`);
      await connection.rollback();
      return;
    }

    if (payment.status !== "captured") {
      console.error(`Webhook: Payment not captured for order ${order.id}. Status: ${payment.status}`);
      await connection.rollback();
      return;
    }

    await connection.execute(
      `UPDATE orders
       SET paid_amount = ?,
           remaining_amount = ?,
           status = ?,
           payment_attempt_state = ?,
           razorpay_payment_id = ?,
           razorpay_webhook_event_id = ?
       WHERE id = ?`,
      [paidAmount, remainingAmount, "Processing", "verified", razorpay_payment_id, eventId, order.id]
    );

    await connection.commit();

    const updatedOrder = await getOrderWithItems("WHERE id = ?", [order.id]);
    await notifyOrderCreated(order.user_id, updatedOrder);
    
    console.log(`Webhook: Successfully verified and finalized order ${order.id}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  handleRazorpayWebhook
};


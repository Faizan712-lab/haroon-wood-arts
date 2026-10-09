const Razorpay = require("razorpay");

let client;

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay configuration is incomplete.");
  }

  if (!client) {
    client = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
  }

  return client;
}

async function createRazorpayOrder({ amount, receipt, notes }) {
  return getRazorpayClient().orders.create({
    amount,
    currency: "INR",
    receipt,
    notes
  });
}

async function getRazorpayPayment(paymentId) {
  return getRazorpayClient().payments.fetch(paymentId);
}

module.exports = {
  createRazorpayOrder,
  getRazorpayPayment
};

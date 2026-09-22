const nodemailer = require("nodemailer");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;"
  }[character]));
}

function formatMoney(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  const date = new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function emailLayout({ title, greeting = "Hello", body, actionText }) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f3ef;color:#3e2723;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px;background:#f7f3ef;"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #eadfd5;border-radius:14px;overflow:hidden;">
      <tr><td style="padding:24px 28px;background:#4a2c1f;color:#ffffff;"><div style="font-size:22px;font-weight:700;">Haroon Stores</div><div style="margin-top:4px;color:#f7d5b6;font-size:13px;">Kashmiri Handcrafted Products</div></td></tr>
      <tr><td style="padding:28px;"><h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#3e2723;">${escapeHtml(title)}</h1><p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${escapeHtml(greeting)},</p>${body}${actionText ? `<p style="margin:24px 0 0;color:#7b5847;font-size:14px;line-height:1.6;">${escapeHtml(actionText)}</p>` : ""}</td></tr>
      <tr><td style="padding:18px 28px;background:#fff7ef;color:#7b5847;font-size:12px;line-height:1.5;">Thank you for supporting Kashmiri craftsmanship.<br>Haroon Stores</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function paragraph(text) {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#5d4037;">${escapeHtml(text)}</p>`;
}

function orderDetails(order) {
  const items = (order.items || []).map(item => `<tr><td style="padding:9px 0;border-bottom:1px solid #eee;"><strong>${escapeHtml(item.name)}</strong>${item.variantLabel ? `<br><span style="color:#7b5847;font-size:13px;">Variant: ${escapeHtml(item.variantLabel)}</span>` : ""}<br><span style="color:#7b5847;font-size:13px;">Quantity: ${escapeHtml(item.quantity)}</span></td><td style="padding:9px 0 9px 12px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">${formatMoney(item.lineTotal ?? (Number(item.price || 0) * Number(item.quantity || 0)))}</td></tr>`).join("");
  const cod = order.paymentMode === "COD" ? `<tr><td style="padding:7px 0;">Online Advance (10%)</td><td style="padding:7px 0;text-align:right;">${formatMoney(order.codAdvance)}</td></tr><tr><td style="padding:7px 0;">Pay on Delivery (90%)</td><td style="padding:7px 0;text-align:right;">${formatMoney(order.codRemainingOnDelivery ?? order.remaining)}</td></tr>` : "";
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;border-collapse:collapse;font-size:14px;color:#3e2723;"><tr><td colspan="2" style="padding:10px 12px;background:#fff3e8;font-weight:700;">Order #${escapeHtml(order.id)}</td></tr>${items}<tr><td style="padding:10px 0;font-weight:700;">Order Total</td><td style="padding:10px 0;text-align:right;font-weight:700;">${formatMoney(order.total)}</td></tr><tr><td style="padding:7px 0;">Payment Method</td><td style="padding:7px 0;text-align:right;">${escapeHtml(order.paymentMode)}</td></tr>${cod}</table>`;
}

function canSend() {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

function transporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
}

async function sendEmail({ to, subject, html }) {
  if (!to || !canSend()) {
    console.warn("Email notification skipped", { reason: to ? "email_not_configured" : "missing_recipient", subject });
    return false;
  }

  try {
    await transporter().sendMail({
      from: `Haroon Stores <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    return true;
  } catch (error) {
    console.error("Email notification failed", { subject, code: error?.code || "unknown", message: error?.message || "unknown" });
    return false;
  }
}

function sendWelcomeEmail(user) {
  return sendEmail({ to: user.email, subject: "Welcome to Haroon Stores", html: emailLayout({ title: "Welcome to Haroon Stores", greeting: user.name, body: paragraph("Your customer account has been successfully created. You can now explore our collection of Kashmiri handcrafted products and place orders with us.") }) });
}

function sendLoginNotificationEmail(user) {
  return sendEmail({ to: user.email, subject: "Welcome Back to Haroon Stores", html: emailLayout({ title: "Welcome Back", greeting: user.name, body: `${paragraph("You have successfully signed in to your Haroon Stores account.")}${paragraph(`Sign-in time: ${formatDate()}`)}`, actionText: "If you did not perform this sign-in, please secure your account." }) });
}

function sendOrderConfirmationEmail(user, order) {
  return sendEmail({ to: user.email, subject: `Order Confirmed — Haroon Stores #${order.id}`, html: emailLayout({ title: "Your order has been received", greeting: user.name, body: `${paragraph("Thank you for your order. We will keep you updated as it moves through each stage.")}${orderDetails(order)}` }) });
}

function sendAdminNewOrderEmail(user, order) {
  return sendEmail({ to: process.env.ADMIN_NOTIFICATION_EMAIL, subject: `New Order Received — #${order.id}`, html: emailLayout({ title: "New order received", body: `${paragraph(`Customer: ${user.name} (${user.email})`)}${user.phone ? paragraph(`Phone: ${user.phone}`) : ""}${paragraph(`Order status: ${order.status}`)}${orderDetails(order)}`, actionText: "Please review and process this order in the Haroon Stores admin panel." }) });
}

function sendStatusEmail(user, order, title, message) {
  return sendEmail({ to: user.email, subject: `${title} — #${order.id}`, html: emailLayout({ title, greeting: user.name, body: `${paragraph(message)}${orderDetails(order)}` }) });
}

const sendOrderProcessingEmail = (user, order) => sendStatusEmail(user, order, "Your Order Has Been Processed", "Our team is now preparing your order. We will notify you when it is shipped.");
const sendOrderShippedEmail = (user, order) => sendStatusEmail(user, order, "Your Order Has Been Shipped", "Good news! Your order is now on its way to you.");
const sendOrderDeliveredEmail = (user, order) => sendStatusEmail(user, order, "Your Order Has Been Delivered", "Your order has been successfully delivered. We hope you enjoy your Kashmiri handcrafted products.");
const sendOrderCancelledEmail = (user, order) => sendStatusEmail(user, order, "Order Cancelled", "Your order has been cancelled successfully. Any refund information will be reflected only when confirmed by Haroon Stores.");
const sendReturnRequestedEmail = (user, order) => sendStatusEmail(user, order, "Return Request Received", `We have received your return request.${order.returnReason ? ` Reason: ${order.returnReason}` : ""} Our team will review it and update you once a decision has been made.`);
const sendReturnApprovedEmail = (user, order) => sendStatusEmail(user, order, "Return Request Approved", "Your return request has been approved. Please follow the return details provided by Haroon Stores.");
const sendReturnRejectedEmail = (user, order) => sendStatusEmail(user, order, "Return Request Update", "We have reviewed your return request. Unfortunately, it has been rejected.");

function sendAdminReturnRequestedEmail(user, order) {
  return sendEmail({ to: process.env.ADMIN_NOTIFICATION_EMAIL, subject: `New Return Request — #${order.id}`, html: emailLayout({ title: "New return request", body: `${paragraph(`Customer: ${user.name} (${user.email})`)}${paragraph(`Reason: ${order.returnReason || "Not provided"}`)}`, actionText: "Please review this request in the Haroon Stores admin panel." }) });
}

module.exports = { sendEmail, sendWelcomeEmail, sendLoginNotificationEmail, sendOrderConfirmationEmail, sendAdminNewOrderEmail, sendOrderProcessingEmail, sendOrderShippedEmail, sendOrderDeliveredEmail, sendReturnRequestedEmail, sendAdminReturnRequestedEmail, sendReturnApprovedEmail, sendReturnRejectedEmail, sendOrderCancelledEmail };

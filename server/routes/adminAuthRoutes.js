const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  getStatus,
  sendRegistrationOtp,
  verifyRegistration,
  login,
  verifyLoginOtp,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  updateAccount,
  logout,
  deactivateMe,
  requireAdminAuth,
  me
} = require("../controllers/adminAuthController");

const router = express.Router();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const isProduction = process.env.NODE_ENV === "production";

function createAdminAuthLimiter(limit) {
  return rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: "Too many attempts. Please try again later."
      });
    }
  });
}

const adminLoginLimiter = createAdminAuthLimiter(isProduction ? 5 : 50);
const adminOtpLimiter = createAdminAuthLimiter(isProduction ? 5 : 50);
const adminRegistrationLimiter = createAdminAuthLimiter(isProduction ? 5 : 20);

router.get("/status", getStatus);
router.post("/register/send-otp", adminRegistrationLimiter, sendRegistrationOtp);
router.post("/register/verify-otp", adminRegistrationLimiter, verifyRegistration);
router.post("/login", adminLoginLimiter, login);
router.post("/verify-device", adminOtpLimiter, verifyLoginOtp);
router.post("/login/verify-otp", adminOtpLimiter, verifyLoginOtp);
router.post("/forgot-password/send-otp", adminLoginLimiter, sendForgotPasswordOtp);
router.post("/forgot-password/verify-otp", adminOtpLimiter, verifyForgotPasswordOtp);
router.post("/logout", requireAdminAuth, logout);
router.get("/me", requireAdminAuth, me);
router.put("/account", requireAdminAuth, updateAccount);
router.delete("/account", requireAdminAuth, deactivateMe);

module.exports = router;

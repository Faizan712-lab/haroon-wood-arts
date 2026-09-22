const express = require("express");

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
const { sensitiveRateLimiter } = require("../middleware/securityMiddleware");
const {
  createImageUpload,
  validateUploadedImages
} = require("../middleware/imageUpload");

const router = express.Router();
const adminLoginLimiter = sensitiveRateLimiter("ADMIN_LOGIN", 5);
const adminOtpLimiter = sensitiveRateLimiter("ADMIN_OTP_VERIFY", 5);
const adminRegistrationLimiter = sensitiveRateLimiter("ADMIN_REGISTER", 5);
const adminProfileImageUpload = createImageUpload("admin-profiles");

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
router.put("/account", requireAdminAuth, adminProfileImageUpload.single("profileImage"), validateUploadedImages, updateAccount);
router.delete("/account", requireAdminAuth, deactivateMe);

module.exports = router;

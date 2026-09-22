const express = require("express");

const {
  forgotPassword,
  verifyOtp,
  resetPassword,
  requestAuthenticatedPasswordChange,
  confirmAuthenticatedPasswordChange
} = require("../controllers/passwordResetController");
const { requireAuth } = require("../middleware/authMiddleware");
const { sensitiveRateLimiter } = require("../middleware/securityMiddleware");

const router = express.Router();
const requestLimiter = sensitiveRateLimiter("PASSWORD_REQUEST", 5);
const verifyLimiter = sensitiveRateLimiter("PASSWORD_VERIFY", 10);

router.post("/forgot", requestLimiter, forgotPassword);
router.post("/verify", verifyLimiter, verifyOtp);
router.post("/reset", verifyLimiter, resetPassword);
router.post("/change/request", requireAuth(["user"]), requestLimiter, requestAuthenticatedPasswordChange);
router.post("/change/confirm", requireAuth(["user"]), verifyLimiter, confirmAuthenticatedPasswordChange);

module.exports = router;

const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  forgotPassword,
  verifyOtp,
  resetPassword
} = require("../controllers/passwordResetController");

const router = express.Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again later."
  }
});

router.post("/forgot", authLimiter, forgotPassword);
router.post("/verify", verifyOtp);
router.post("/reset", resetPassword);

module.exports = router;

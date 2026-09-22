const express = require("express");

const {
  register,
  login,
  me,
  updateMe,
  logout,
  requestRegistrationOtp,
  verifyRegistrationOtp
} = require("../controllers/authController");

const {
  requireAuth
} = require("../middleware/authMiddleware");
const { sensitiveRateLimiter } = require("../middleware/securityMiddleware");
const {
  createImageUpload,
  validateUploadedImages
} = require("../middleware/imageUpload");

const router = express.Router();
const profileImageUpload = createImageUpload("user-profiles");

router.post("/register", sensitiveRateLimiter("CUSTOMER_REGISTER", 10), register);
router.post("/register/send-otp", sensitiveRateLimiter("CUSTOMER_OTP_REQUEST", 5), requestRegistrationOtp);
router.post("/register/verify-otp", sensitiveRateLimiter("CUSTOMER_OTP_VERIFY", 10), verifyRegistrationOtp);
router.post("/login", sensitiveRateLimiter("CUSTOMER_LOGIN", 12), login);
router.get("/me", requireAuth(), me);
router.put("/me", requireAuth(["user"]), profileImageUpload.single("profileImage"), validateUploadedImages, updateMe);
router.post("/logout", logout);

module.exports = router;

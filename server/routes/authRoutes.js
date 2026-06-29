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

const router = express.Router();

router.post("/register", register);
router.post("/register/send-otp", requestRegistrationOtp);
router.post("/register/verify-otp", verifyRegistrationOtp);
router.post("/login", login);
router.get("/me", requireAuth(), me);
router.put("/me", requireAuth(["user"]), updateMe);
router.post("/logout", logout);

module.exports = router;

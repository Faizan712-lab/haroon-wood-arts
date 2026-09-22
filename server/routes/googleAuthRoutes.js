const express = require("express");

const {
  googleAuth
} = require("../controllers/googleAuthController");
const { sensitiveRateLimiter } = require("../middleware/securityMiddleware");

const router = express.Router();

router.post("/google", sensitiveRateLimiter("GOOGLE_AUTH", 15), googleAuth);

module.exports = router;

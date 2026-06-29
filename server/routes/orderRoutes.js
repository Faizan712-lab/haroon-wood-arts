const express = require("express");
const router = express.Router();

const {
  requireAuth,
  optionalAuth
} = require("../middleware/authMiddleware");

const {
  createOrder,
  getOrders,
  getOrderById,
  updateStatus,
  requestCancellation,
  approveCancellation,
  rejectCancellation,
  requestReturn,
  approveReturn,
  rejectReturn,
  markPickupScheduled,
  markPickupCompleted,
  markReturnCompleted,
  markRefundCompleted
} = require("../controllers/orderController");

router.post("/", requireAuth(["user"]), createOrder);
router.get("/", optionalAuth(["admin"]), getOrders);
router.get("/:id", optionalAuth(["user", "admin"]), getOrderById);
router.patch("/:id/status", updateStatus);
router.patch("/:id/cancel-request", requestCancellation);
router.patch("/:id/cancel-approve", approveCancellation);
router.patch("/:id/cancel-reject", rejectCancellation);
router.patch("/:id/return-request", requestReturn);
router.patch("/:id/return-approve", approveReturn);
router.patch("/:id/return-reject", rejectReturn);
router.patch("/:id/pickup-scheduled", markPickupScheduled);
router.patch("/:id/pickup-completed", markPickupCompleted);
router.patch("/:id/return-completed", markReturnCompleted);
router.patch("/:id/refund-completed", markRefundCompleted);

module.exports = router;

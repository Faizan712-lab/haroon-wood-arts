const express = require("express");
const router = express.Router();

const {
  requireAuth,
  optionalAuth
} = require("../middleware/authMiddleware");
const { requireAdminAuth } = require("../controllers/adminAuthController");
const {
  createImageUpload,
  validateUploadedImages
} = require("../middleware/imageUpload");

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

const returnEvidenceUpload = createImageUpload("returns");

router.post("/", requireAuth(["user"]), createOrder);
router.get("/", requireAdminAuth, getOrders);
router.get("/:id", requireAuth(["user", "admin"]), getOrderById);
router.patch("/:id/status", requireAdminAuth, updateStatus);
router.patch("/:id/cancel-request", requireAuth(["user"]), requestCancellation);
router.patch("/:id/cancel-approve", requireAdminAuth, approveCancellation);
router.patch("/:id/cancel-reject", requireAdminAuth, rejectCancellation);
router.patch("/:id/return-request", requireAuth(["user"]), returnEvidenceUpload.single("image"), validateUploadedImages, requestReturn);
router.patch("/:id/return-approve", requireAdminAuth, approveReturn);
router.patch("/:id/return-reject", requireAdminAuth, rejectReturn);
router.patch("/:id/pickup-scheduled", requireAdminAuth, markPickupScheduled);
router.patch("/:id/pickup-completed", requireAdminAuth, markPickupCompleted);
router.patch("/:id/return-completed", requireAdminAuth, markReturnCompleted);
router.patch("/:id/refund-completed", requireAdminAuth, markRefundCompleted);

module.exports = router;

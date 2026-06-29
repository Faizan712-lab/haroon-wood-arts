const express = require("express");

const {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress
} = require("../controllers/addressController");

const {
  requireAuth
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth(["user"]));

router.get("/", listAddresses);
router.post("/", createAddress);
router.put("/:id", updateAddress);
router.delete("/:id", deleteAddress);

module.exports = router;

const express = require("express");
const router = express.Router();

const {
  getWishlist,
  addWishlistItem,
  removeWishlistItem
} = require("../controllers/wishlistController");

const {
  requireAuth
} = require("../middleware/authMiddleware");

router.get("/", requireAuth(["user"]), getWishlist);
router.post("/:productId", requireAuth(["user"]), addWishlistItem);
router.delete("/:productId", requireAuth(["user"]), removeWishlistItem);

module.exports = router;

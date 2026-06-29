const express = require("express");
const router = express.Router();

const {
  getProducts,
  getProductById,
  addProduct,
  updateProduct,
  addProductReview,
  deleteProduct
} = require("../controllers/productController");

const {
  requireAuth
} = require("../middleware/authMiddleware");

router.get("/", getProducts);
router.get("/:id", getProductById);
router.post("/", addProduct);
router.put("/:id", updateProduct);
router.post("/:id/reviews", requireAuth(["user"]), addProductReview);
router.delete("/:id", deleteProduct);

module.exports = router;

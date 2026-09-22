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
const { requireAdminAuth } = require("../controllers/adminAuthController");
const {
  createImageUpload,
  validateUploadedImages
} = require("../middleware/imageUpload");

const productImagesUpload = createImageUpload("products", 72, {
  variantImages: "variants"
});

router.get("/", getProducts);
router.get("/:id", getProductById);
const productImageFields = productImagesUpload.fields([
  { name: "images", maxCount: 8 },
  { name: "variantImages", maxCount: 64 }
]);

router.post("/", requireAdminAuth, productImageFields, validateUploadedImages, addProduct);
router.put("/:id", requireAdminAuth, productImageFields, validateUploadedImages, updateProduct);
router.post("/:id/reviews", requireAuth(["user"]), addProductReview);
router.delete("/:id", requireAdminAuth, deleteProduct);

module.exports = router;

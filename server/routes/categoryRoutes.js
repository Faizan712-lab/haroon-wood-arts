const express = require("express");
const router = express.Router();

const {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory
} = require("../controllers/categoryController");
const {
  createImageUpload,
  validateUploadedImages
} = require("../middleware/imageUpload");
const { requireAdminAuth } = require("../controllers/adminAuthController");

const categoryImagesUpload = createImageUpload("categories");

router.get("/", getCategories);
router.post("/", requireAdminAuth, categoryImagesUpload.array("images", 8), validateUploadedImages, addCategory);
router.put("/:id", requireAdminAuth, categoryImagesUpload.array("images", 8), validateUploadedImages, updateCategory);
router.delete("/:id", requireAdminAuth, deleteCategory);

module.exports = router;

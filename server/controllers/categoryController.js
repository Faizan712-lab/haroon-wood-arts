const db = require("../config/db");
const {
  uploadedImagePaths,
  deleteCloudinaryImages
} = require("../middleware/imageUpload");

function runQuery(sql, params = []) {
  return db.promise().execute(sql, params);
}

function mapCategory(row) {
  const images = parseImages(row.category_images, row.image);

  return {
    id: row.id,
    name: row.name,
    image: images[0] || "",
    images,
    category_images: images
  };
}

function parseImages(value, fallback = "") {
  const images = [];

  if (Array.isArray(value)) {
    images.push(...value);
  } else if (value) {
    try {
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
      if (Array.isArray(parsed)) {
        images.push(...parsed);
      }
    } catch {
      images.push(value);
    }
  }

  if (fallback) {
    images.push(fallback);
  }

  return [...new Set(
    images
      .map(image => String(image || "").trim())
      .filter(Boolean)
  )].slice(0, 8);
}

async function requestImages(req, fallbackImage = "") {
  const uploaded = await uploadedImagePaths(req, "categories");
  const bodyImages = parseImages(
    req.body.category_images ?? req.body.images,
    req.body.image || fallbackImage
  );

  return [...uploaded, ...bodyImages].slice(0, 8);
}

function removedImages(previousImages, nextImages) {
  const next = new Set(nextImages);
  return previousImages.filter(image => !next.has(image));
}

function getNumericCategoryId(rawId) {
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

async function getCategories(req, res) {
  try {

    const [savedCategories] = await runQuery(`
      SELECT id, name, image, category_images
      FROM categories
      ORDER BY name ASC
    `);

    res.json({
      success: true,
      categories: savedCategories.map(mapCategory)
    });
  } catch (error) {
    console.error("Failed to get categories:", error);

    res.status(500).json({
      success: false,
      message: "Database Error"
    });
  }
}

async function addCategory(req, res) {
  try {

    const name =
      String(req.body.name || "").trim();
    const image =
      req.body.image || "";
    const [existingRows] = await runQuery(
      "SELECT image, category_images FROM categories WHERE name = ? LIMIT 1",
      [name]
    );
    const previousImages = existingRows[0]
      ? parseImages(existingRows[0].category_images, existingRows[0].image)
      : [];
    const images = await requestImages(req, image);

    if (!name || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Category name and image are required."
      });
    }

    await runQuery(
      `
        INSERT INTO categories (name, image, category_images)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          image = VALUES(image),
          category_images = VALUES(category_images),
          updated_at = CURRENT_TIMESTAMP
      `,
      [name, images[0], JSON.stringify(images)]
    );
    await deleteCloudinaryImages(removedImages(previousImages, images));

    const [rows] = await runQuery(
      "SELECT id, name, image, category_images FROM categories WHERE name = ? LIMIT 1",
      [name]
    );

    res.status(201).json({
      success: true,
      category: mapCategory(rows[0])
    });
  } catch (error) {
    console.error("Failed to add category:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add category"
    });
  }
}

async function deleteCategory(req, res) {
  try {

    const id = getNumericCategoryId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Unable to delete category"
      });
    }

    const [categories] = await runQuery(
      "SELECT name, image, category_images FROM categories WHERE id = ? LIMIT 1",
      [id]
    );

    if (!categories[0]) {
      return res.status(404).json({
        success: false,
        message: "Unable to delete category"
      });
    }

    await runQuery(
      "DELETE FROM categories WHERE id = ?",
      [id]
    );
    await deleteCloudinaryImages(
      parseImages(categories[0].category_images, categories[0].image)
    );

    res.json({
      success: true,
      message: "Category deleted successfully"
    });
  } catch (error) {
    console.error("Failed to delete category:", error);

    res.status(500).json({
      success: false,
      message: "Unable to delete category"
    });
  }
}

async function updateCategory(req, res) {
  try {

    const id = getNumericCategoryId(req.params.id);
    const name = String(req.body.name || "").trim();
    const image = req.body.image || "";
    if (!id || !name) {
      return res.status(400).json({
        success: false,
        message: "Unable to update category"
      });
    }

    const [existingRows] = await runQuery(
      "SELECT image, category_images FROM categories WHERE id = ? LIMIT 1",
      [id]
    );
    if (!existingRows[0]) {
      return res.status(404).json({ success: false, message: "Unable to update category" });
    }

    const previousImages = parseImages(
      existingRows[0].category_images,
      existingRows[0].image
    );
    const images = await requestImages(req, image);

    if (images.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Unable to update category"
      });
    }

    const [result] = await runQuery(
      `
        UPDATE categories
        SET name = ?, image = ?, category_images = ?
        WHERE id = ?
      `,
      [name, images[0], JSON.stringify(images), id]
    );
    await deleteCloudinaryImages(removedImages(previousImages, images));

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Unable to update category"
      });
    }

    const [rows] = await runQuery(
      "SELECT id, name, image, category_images FROM categories WHERE id = ? LIMIT 1",
      [id]
    );

    res.json({
      success: true,
      message: "Category updated successfully",
      category: mapCategory(rows[0])
    });
  }
  catch (error) {
    console.error("Failed to update category:", error);

    const duplicateEntry =
      error && error.code === "ER_DUP_ENTRY";

    res.status(duplicateEntry ? 409 : 500).json({
      success: false,
      message: "Unable to update category"
    });
  }
}

module.exports = {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory
};

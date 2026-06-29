const db = require("../config/db");

function runQuery(sql, params = []) {
  return db.promise().execute(sql, params);
}

function mapCategory(row) {
  return {
    id: row.id,
    name: row.name,
    image: row.image || ""
  };
}

function getNumericCategoryId(rawId) {
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

async function ensureCategoriesTable() {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL UNIQUE,
      image LONGTEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function getCategories(req, res) {
  try {
    await ensureCategoriesTable();

    const [savedCategories] = await runQuery(`
      SELECT id, name, image
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
    await ensureCategoriesTable();

    const name =
      String(req.body.name || "").trim();
    const image =
      req.body.image || "";

    if (!name || !image) {
      return res.status(400).json({
        success: false,
        message: "Category name and image are required."
      });
    }

    await runQuery(
      `
        INSERT INTO categories (name, image)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE
          image = VALUES(image),
          updated_at = CURRENT_TIMESTAMP
      `,
      [name, image]
    );

    const [rows] = await runQuery(
      "SELECT id, name, image FROM categories WHERE name = ? LIMIT 1",
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
    await ensureCategoriesTable();

    const id = getNumericCategoryId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Unable to delete category"
      });
    }

    const [categories] = await runQuery(
      "SELECT name FROM categories WHERE id = ? LIMIT 1",
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
    await ensureCategoriesTable();

    const id = getNumericCategoryId(req.params.id);
    const name = String(req.body.name || "").trim();
    const image = req.body.image || "";

    if (!id || !name || !image) {
      return res.status(400).json({
        success: false,
        message: "Unable to update category"
      });
    }

    const [result] = await runQuery(
      `
        UPDATE categories
        SET name = ?, image = ?
        WHERE id = ?
      `,
      [name, image, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Unable to update category"
      });
    }

    const [rows] = await runQuery(
      "SELECT id, name, image FROM categories WHERE id = ? LIMIT 1",
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

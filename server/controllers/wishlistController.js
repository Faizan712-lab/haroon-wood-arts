const db = require("../config/db");

async function getWishlist(req, res) {
  try {

    const [items] = await db.promise().execute(
      `
        SELECT
          wishlists.product_id,
          products.name,
          products.description,
          products.price,
          products.discount_percent,
          products.category,
          products.image,
          products.stock,
          products.stock_status,
          COALESCE(AVG(product_reviews.rating), 0) AS average_rating,
          COUNT(product_reviews.id) AS review_count
        FROM wishlists
        INNER JOIN products ON products.id = wishlists.product_id
        LEFT JOIN product_reviews
          ON product_reviews.product_id = products.id
        WHERE wishlists.user_id = ?
        GROUP BY
          wishlists.id,
          wishlists.product_id,
          products.name,
          products.description,
          products.price,
          products.discount_percent,
          products.category,
          products.image,
          products.stock,
          products.stock_status
        ORDER BY wishlists.id DESC
      `,
      [req.auth.id]
    );

    res.json({
      success: true,
      items: items.map(item => ({
        ...item,
        id: item.product_id,
        productId: item.product_id,
        discountPercent: Number(item.discount_percent || 0),
        stockStatus: item.stock_status || "in_stock",
        averageRating: Number(item.average_rating || 0),
        reviewCount: Number(item.review_count || 0)
      }))
    });
  } catch (error) {
    console.error("Failed to get wishlist:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load wishlist"
    });
  }
}

async function addWishlistItem(req, res) {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid product." });
    }

    await db.promise().execute(
      `
        INSERT IGNORE INTO wishlists (user_id, product_id)
        VALUES (?, ?)
      `,
      [req.auth.id, productId]
    );

    res.status(201).json({
      success: true,
      message: "Added to wishlist"
    });
  } catch (error) {
    console.error("Failed to add wishlist item:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update wishlist"
    });
  }
}

async function removeWishlistItem(req, res) {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid product." });
    }

    await db.promise().execute(
      `
        DELETE FROM wishlists
        WHERE user_id = ? AND product_id = ?
      `,
      [req.auth.id, productId]
    );

    res.json({
      success: true,
      message: "Removed from wishlist"
    });
  } catch (error) {
    console.error("Failed to remove wishlist item:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update wishlist"
    });
  }
}

module.exports = {
  getWishlist,
  addWishlistItem,
  removeWishlistItem
};

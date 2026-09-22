const db = require("../config/db");
const {
  uploadedImagePaths,
  deleteCloudinaryImages
} = require("../middleware/imageUpload");

function normalizeDiscountPercent(value) {
  const percent = Number(value || 0);

  if (!Number.isFinite(percent)) {
    return 0;
  }

  return Math.min(90, Math.max(0, Math.round(percent)));
}

function calculateDiscountedPrice(price, discountPercent) {
  const percent = normalizeDiscountPercent(discountPercent);

  if (percent <= 0) {
    return price;
  }

  return Math.round((price - (price * percent) / 100) * 100) / 100;
}

function parseSizes(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed =
      typeof value === "string"
        ? JSON.parse(value)
        : value;

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseRequestArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
  const uploaded = await uploadedImagePaths(req, "products", "images");
  const imageOrder = parseRequestArray(req.body.image_order);

  if (imageOrder.length > 0) {
    return imageOrder
      .map(image => {
        const match = /^upload:(\d+)$/.exec(String(image || ""));
        return match ? uploaded[Number(match[1])] : image;
      })
      .map(image => String(image || "").trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  const bodyImages = parseImages(
    req.body.product_images ?? req.body.images,
    req.body.image || fallbackImage
  );

  return [...uploaded, ...bodyImages].slice(0, 8);
}

async function resolveVariantImages(req, variants) {
  const uploaded = await uploadedImagePaths(req, "variants", "variantImages");
  const resolvedVariants = variants.map(variant => ({
    ...variant,
    images: parseImages(variant.variant_images ?? variant.images).map(image => {
      const match = /^upload:(\d+)$/.exec(String(image || ""));
      return match ? uploaded[Number(match[1])] || "" : image;
    }).filter(Boolean)
  }));

  return { variants: resolvedVariants, uploaded };
}

function removedImages(previousImages, nextImages) {
  const next = new Set(nextImages);
  return previousImages.filter(image => !next.has(image));
}

function mapProduct(row) {
  const price =
    Number(row.price || 0);

  const discountPercent =
    normalizeDiscountPercent(row.discount_percent);

  const legacyDiscountPrice =
    row.discount_price === null ||
    row.discount_price === undefined
      ? null
      : Number(row.discount_price);

  const discountedPrice =
    discountPercent > 0
      ? calculateDiscountedPrice(price, discountPercent)
      : legacyDiscountPrice && legacyDiscountPrice > 0 && legacyDiscountPrice < price
        ? legacyDiscountPrice
        : price;

  const images = parseImages(row.product_images, row.image);

  return {
    ...row,
    images,
    product_images: images,
    image: images[0] || "",
    price,
    discountPercent,
    discount_percent: discountPercent,
    discountPrice: discountedPrice < price ? discountedPrice : null,
    discount_price: discountedPrice < price ? discountedPrice : null,
    discountedPrice,
    finalPrice: discountedPrice,
    stockStatus: row.stock_status || "in_stock",
    stock_status: row.stock_status || "in_stock",
    variants: [],
    sizes: [],
    averageRating: Number(row.average_rating || 0),
    reviewCount: Number(row.review_count || 0)
  };
}

function mapVariant(row, product) {
  const price = Number(row.price || product.price || 0);
  const label = row.size_label || row.size || "";
  const images = parseImages(row.variant_images);
  const discountedPrice =
    product.discountPercent > 0
      ? calculateDiscountedPrice(price, product.discountPercent)
      : price;

  return {
    id: row.id,
    productId: row.product_id,
    size: label,
    label,
    sizeLabel: label,
    price,
    stock: Number(row.stock || 0),
    images,
    variant_images: images,
    discountedPrice,
    finalPrice: discountedPrice
  };
}

async function attachVariants(products) {
  if (products.length === 0) {
    return products;
  }

  const ids = products.map(product => product.id);
  const placeholders = ids.map(() => "?").join(",");
  const [variantRows] = await db.promise().execute(
    `
      SELECT *
      FROM product_variants
      WHERE product_id IN (${placeholders})
      ORDER BY id ASC
    `,
    ids
  );

  const byProductId = variantRows.reduce((grouped, row) => {
    grouped[row.product_id] = grouped[row.product_id] || [];
    grouped[row.product_id].push(row);
    return grouped;
  }, {});

  return products.map(product => {
    const variants =
      (byProductId[product.id] || []).map(row =>
        mapVariant(row, product)
      );

    const legacySizes =
      variants.length > 0
        ? []
        : parseSizes(product.sizes).map((size, index) => ({
            id: size.id || `legacy-${product.id}-${index}`,
            productId: product.id,
            size: size.label || size.size || "",
            label: size.label || size.size || "",
            price: Number(size.price || product.finalPrice || product.price || 0),
            stock: Number(size.stock || product.stock || 0),
            discountedPrice: calculateDiscountedPrice(
              Number(size.price || product.price || 0),
              product.discountPercent
            ),
            finalPrice: calculateDiscountedPrice(
              Number(size.price || product.price || 0),
              product.discountPercent
            )
          }));

    const allVariants =
      variants.length > 0 ? variants : legacySizes;

    return {
      ...product,
      variants: allVariants,
      sizes: allVariants
    };
  });
}

async function getReviews(productId) {
  const [reviews] = await db.promise().execute(
    `
      SELECT
        product_reviews.id,
        product_reviews.rating,
        COALESCE(product_reviews.review, product_reviews.comment) AS review_text,
        product_reviews.created_at,
        users.name AS customer_name
      FROM product_reviews
      LEFT JOIN users ON users.id = product_reviews.user_id
      WHERE product_reviews.product_id = ?
      ORDER BY product_reviews.id DESC
    `,
    [productId]
  );

  return reviews.map(review => ({
    id: review.id,
    rating: Number(review.rating || 0),
    review: review.review_text || "",
    comment: review.review_text || "",
    createdAt: review.created_at,
    customerName: review.customer_name || "Customer"
  }));
}

async function saveVariants(productId, variants, fallbackPrice, fallbackStock) {
  const [previousRows] = await db.promise().execute(
    "SELECT variant_images FROM product_variants WHERE product_id = ?",
    [productId]
  );
  const previousImages = previousRows.flatMap(row => parseImages(row.variant_images));
  await db.promise().execute(
    "DELETE FROM product_variants WHERE product_id = ?",
    [productId]
  );

  const cleanVariants =
    variants
      .filter(variant =>
        String(variant.size || variant.label || "").trim()
      )
      .map(variant => ({
        size: String(variant.size || variant.label || "").trim(),
        price: Number(variant.price || fallbackPrice || 0),
        stock: Number(variant.stock ?? fallbackStock ?? 0),
        images: parseImages(variant.variant_images ?? variant.images)
      }));

  for (const variant of cleanVariants) {
    await db.promise().execute(
      `
        INSERT INTO product_variants
        (product_id, size_label, price, stock, variant_images)
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        productId,
        variant.size,
        variant.price,
        variant.stock,
        JSON.stringify(variant.images)
      ]
    );
  }

  const nextImages = cleanVariants.flatMap(variant => variant.images);
  await deleteCloudinaryImages(removedImages(previousImages, nextImages));
}

// GET ALL PRODUCTS
const getProducts = async (req, res) => {
  try {

    const [products] = await db.promise().execute(
      `
        SELECT
          products.*,
          COALESCE(AVG(product_reviews.rating), 0) AS average_rating,
          COUNT(product_reviews.id) AS review_count
        FROM products
        LEFT JOIN product_reviews
          ON product_reviews.product_id = products.id
        GROUP BY products.id
        ORDER BY products.id DESC
      `
    );

    res.status(200).json({
      success: true,
      products: await attachVariants(products.map(mapProduct))
    });
  } catch (err) {
    console.error("Failed to get products:", err);

    res.status(500).json({
      success: false,
      message: "Database Error"
    });
  }
};

// GET SINGLE PRODUCT
const getProductById = async (req, res) => {
  try {

    const [result] = await db.promise().execute(
      `
        SELECT
          products.*,
          COALESCE(AVG(product_reviews.rating), 0) AS average_rating,
          COUNT(product_reviews.id) AS review_count
        FROM products
        LEFT JOIN product_reviews
          ON product_reviews.product_id = products.id
        WHERE products.id = ?
        GROUP BY products.id
      `,
      [req.params.id]
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const [product] = await attachVariants([mapProduct(result[0])]);
    product.reviews = await getReviews(req.params.id);

    res.status(200).json({
      success: true,
      product
    });
  } catch (err) {
    console.error("Failed to get product:", err);

    res.status(500).json({
      success: false,
      message: "Database Error"
    });
  }
};

// ADD PRODUCT
const addProduct = async (req, res) => {
  const {
    name,
    description,
    price,
    discountPrice,
    discount_price,
    discountPercent,
    discount_percent,
    category,
    image,
    stock,
    stockStatus,
    stock_status,
    sizes,
    variants
  } = req.body;
  const discount =
    normalizeDiscountPercent(
      discountPercent ?? discount_percent ?? 0
    );

  let productVariants =
    parseRequestArray(variants).length > 0
      ? parseRequestArray(variants)
      : parseRequestArray(sizes);

  const normalizedStockStatus =
    (stockStatus || stock_status) === "out_of_stock"
      ? "out_of_stock"
      : "in_stock";

  let variantUploadedImages = [];

  try {
    const images = await requestImages(req, image);
    const resolvedVariants = await resolveVariantImages(req, productVariants);
    productVariants = resolvedVariants.variants;
    variantUploadedImages = resolvedVariants.uploaded;

    const [result] = await db.promise().execute(
      `
        INSERT INTO products
        (name, description, price, discount_price, discount_percent, category, image, product_images, stock, stock_status, sizes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name,
        description,
        Number(price || 0),
        null,
        discount,
        category,
        images[0] || "",
        JSON.stringify(images),
        stock,
        normalizedStockStatus,
        JSON.stringify([])
      ]
    );

    await saveVariants(result.insertId, productVariants, Number(price || 0), Number(stock || 0));

    res.status(201).json({
      success: true,
      message: "Product added successfully"
    });
  } catch (err) {
    await deleteCloudinaryImages(variantUploadedImages);
    console.error("Failed to add product:", err);

    res.status(500).json({
      success: false,
      message: "Failed to add product"
    });
  }
};

const addProductReview = async (req, res) => {
  const productId = Number(req.params.id);
  const rating = Number(req.body.rating);

  const comment = String(req.body.review ?? req.body.comment ?? "").trim();

  if (!req.auth?.id || req.auth.role !== "user") {
    return res.status(401).json({
      success: false,
      message: "Please login to rate this product"
    });
  }

  if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: "Rating must be between 1 and 5"
    });
  }

  if (comment.length > 2000) {
    return res.status(400).json({ success: false, message: "Review is too long." });
  }

  try {

    const [purchases] = await db.promise().execute(
      `
        SELECT order_items.id
        FROM order_items
        INNER JOIN orders ON orders.id = order_items.order_id
        WHERE orders.user_id = ?
          AND order_items.product_id = ?
          AND LOWER(orders.status) NOT IN ('cancelled', 'cancellation requested')
        LIMIT 1
      `,
        [req.auth.id, productId]
    );

    if (purchases.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You can review this product after purchasing it"
      });
    }

    await db.promise().execute(
      `
        INSERT INTO product_reviews
        (product_id, user_id, rating, review, comment)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          rating = VALUES(rating),
          review = VALUES(review),
          comment = VALUES(comment)
      `,
      [
        productId,
        req.auth.id,
        rating,
        comment,
        comment
      ]
    );

    const [productRows] = await db.promise().execute(
      `
        SELECT
          products.*,
          COALESCE(AVG(product_reviews.rating), 0) AS average_rating,
          COUNT(product_reviews.id) AS review_count
        FROM products
        LEFT JOIN product_reviews
          ON product_reviews.product_id = products.id
        WHERE products.id = ?
        GROUP BY products.id
      `,
      [productId]
    );

    if (productRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const [product] = await attachVariants([mapProduct(productRows[0])]);
    product.reviews = await getReviews(req.params.id);

    res.status(200).json({
      success: true,
      message: "Review saved successfully",
      product
    });
  } catch (err) {
    console.error("Failed to save product review:", err);

    res.status(500).json({
      success: false,
      message: "Failed to save review"
    });
  }
};

// UPDATE PRODUCT
const updateProduct = async (req, res) => {
  const {
    name,
    description,
    price,
    discountPrice,
    discount_price,
    discountPercent,
    discount_percent,
    category,
    image,
    stock,
    stockStatus,
    stock_status,
    sizes,
    variants
  } = req.body;
  const discount =
    normalizeDiscountPercent(
      discountPercent ?? discount_percent ?? 0
    );

  let productVariants =
    parseRequestArray(variants).length > 0
      ? parseRequestArray(variants)
      : parseRequestArray(sizes);

  const normalizedStockStatus =
    (stockStatus || stock_status) === "out_of_stock"
      ? "out_of_stock"
      : "in_stock";

  let variantUploadedImages = [];

  try {
    const [existingRows] = await db.promise().execute(
      "SELECT image, product_images FROM products WHERE id = ? LIMIT 1",
      [req.params.id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const previousImages = parseImages(
      existingRows[0].product_images,
      existingRows[0].image
    );
    const incomingImages = await requestImages(req);
    const nextImages = incomingImages.length > 0 ? incomingImages : parseImages(image);
    const resolvedVariants = await resolveVariantImages(req, productVariants);
    productVariants = resolvedVariants.variants;
    variantUploadedImages = resolvedVariants.uploaded;

    const [result] = await db.promise().execute(
      `
        UPDATE products
        SET
          name = ?,
          description = ?,
          price = ?,
          discount_price = ?,
          discount_percent = ?,
          category = ?,
          image = ?,
          product_images = ?,
          stock = ?,
          stock_status = ?,
          sizes = ?
        WHERE id = ?
      `,
      [
        name,
        description,
        Number(price || 0),
        null,
        discount,
        category,
        nextImages[0] || image || "",
        JSON.stringify(nextImages),
        stock,
        normalizedStockStatus,
        JSON.stringify([]),
        req.params.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    await saveVariants(req.params.id, productVariants, Number(price || 0), Number(stock || 0));
    await deleteCloudinaryImages(removedImages(previousImages, nextImages));

    const [rows] = await db.promise().execute(
      `
        SELECT
          products.*,
          COALESCE(AVG(product_reviews.rating), 0) AS average_rating,
          COUNT(product_reviews.id) AS review_count
        FROM products
        LEFT JOIN product_reviews
          ON product_reviews.product_id = products.id
        WHERE products.id = ?
        GROUP BY products.id
      `,
      [req.params.id]
    );

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: (await attachVariants([mapProduct(rows[0])]))[0]
    });
  } catch (err) {
    await deleteCloudinaryImages(variantUploadedImages);
    console.error("Failed to update product:", err);

    res.status(500).json({
      success: false,
      message: "Failed to update product"
    });
  }
};

// DELETE PRODUCT
const deleteProduct = async (req, res) => {
  try {
    const [rows] = await db.promise().execute(
      "SELECT image, product_images FROM products WHERE id = ? LIMIT 1",
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const [variantRows] = await db.promise().execute(
      "SELECT variant_images FROM product_variants WHERE product_id = ?",
      [rows[0].id || req.params.id]
    );
    await db.promise().execute("DELETE FROM products WHERE id = ?", [req.params.id]);
    await deleteCloudinaryImages(parseImages(rows[0].product_images, rows[0].image));
    await deleteCloudinaryImages(variantRows.flatMap(row => parseImages(row.variant_images)));

    res.status(200).json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (err) {
    console.error("Failed to delete product:", err);
    res.status(500).json({ success: false, message: "Failed to delete product" });
  }
};

module.exports = {
  getProducts,
  getProductById,
  addProduct,
  updateProduct,
  addProductReview,
  deleteProduct
};

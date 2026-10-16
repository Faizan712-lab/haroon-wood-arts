import "./Admin.css";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FaCheckCircle,
  FaEdit,
  FaFilter,
  FaPlus,
  FaSearch,
  FaTimes,
  FaTimesCircle,
  FaTrash
} from "react-icons/fa";

import { getApiUrl } from "../../utils/api";
import {
  PRODUCT_PLACEHOLDER,
  getImageList,
  getPrimaryImage,
  handleImageFallback
} from "../../utils/imageFallback";
import ConfirmModal from "../../components/ConfirmModal";

function AdminProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stockUpdatingId, setStockUpdatingId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  /* LOAD PRODUCTS */
  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      setIsLoading(true);
      const response = await fetch(getApiUrl("/api/products"), {
        cache: "no-store"
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setProducts(data.products || []);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error("Failed to load products:", error);
      toast.error("Failed to load products");
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }

  /* TOGGLE IN_STOCK / OUT_OF_STOCK */
  async function toggleStockStatus(product) {
    if (stockUpdatingId) return;

    const currentStatus = product.stockStatus || product.stock_status || "in_stock";
    const nextStatus = currentStatus === "out_of_stock" ? "in_stock" : "out_of_stock";

    try {
      setStockUpdatingId(product.id);
      const response = await fetch(getApiUrl(`/api/products/${product.id}/stock-status`), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockStatus: nextStatus })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update stock status");
      }

      setProducts(previous =>
        previous.map(item =>
          String(item.id) === String(product.id)
            ? (data.product || { ...item, stockStatus: nextStatus, stock_status: nextStatus })
            : item
        )
      );

      toast.success(
        nextStatus === "in_stock"
          ? `"${product.name}" marked as In Stock`
          : `"${product.name}" marked as Out of Stock`
      );
    } catch (error) {
      toast.error(error.message || "Failed to update stock status");
    } finally {
      setStockUpdatingId(null);
    }
  }

  /* PERMANENTLY DELETE PRODUCT */
  async function deleteProductPermanently() {
    if (!productToDelete || isDeleting) return;

    try {
      setIsDeleting(true);
      const response = await fetch(getApiUrl(`/api/products/${productToDelete.id}`), {
        method: "DELETE",
        credentials: "include"
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setProducts(previous =>
          previous.filter(item => String(item.id) !== String(productToDelete.id))
        );
        toast.success(`"${productToDelete.name}" permanently deleted from catalog`);
        setProductToDelete(null);
      } else {
        toast.error(data.message || "Failed to delete product");
      }
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast.error("Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  }

  function normalizeSizes(product) {
    const source =
      product.variants?.length > 0
        ? product.variants
        : product.sizes || [];

    return source.length > 0
      ? source.map(size => {
          let imgs = [];
          if (Array.isArray(size.images)) {
            imgs = size.images;
          } else if (size.variant_images) {
            imgs = Array.isArray(size.variant_images)
              ? size.variant_images
              : (() => {
                  try {
                    return JSON.parse(size.variant_images);
                  } catch {
                    return [];
                  }
                })();
          }

          return {
            id: size.id || "",
            size: size.size || size.label || size.size_label || "",
            price:
              size.price === undefined || size.price === null
                ? ""
                : String(size.price),
            stock:
              size.stock === undefined || size.stock === null
                ? ""
                : String(size.stock),
            images: imgs
          };
        })
      : [
          {
            id: "",
            size: "",
            price: "",
            stock: "",
            images: []
          }
        ];
  }

  function openEditProduct(product) {
    setEditingProduct(product);
    setEditForm({
      name: product.name || "",
      price: String(product.price || ""),
      discountPercent: String(product.discountPercent || 0),
      category: product.category || "",
      description: product.description || "",
      image: getPrimaryImage(product) || "",
      images: getImageList(product),
      stock: product.stock !== undefined && product.stock !== null ? String(product.stock) : "0",
      stockStatus:
        product.stockStatus ||
        product.stock_status ||
        "in_stock",
      variants: normalizeSizes(product)
    });
  }

  function closeEditProduct() {
    setEditingProduct(null);
    setEditForm(null);
  }

  function updateEditField(field, value) {
    setEditForm(previous => ({
      ...previous,
      [field]: value
    }));
  }

  function updateEditImages(nextImages) {
    setEditForm(previous => ({
      ...previous,
      images: nextImages,
      image: nextImages[0] || ""
    }));
  }

  function readImageFile(file) {
    return new Promise((resolve, reject) => {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        reject(new Error("Only JPG, PNG, and WEBP images are allowed."));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        reject(new Error("Each image must be 5MB or smaller."));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read image."));
      reader.readAsDataURL(file);
    });
  }

  async function appendDataImage(payload, image, index, fieldName = "images", namePrefix = "product-image") {
    const response = await fetch(image);
    const blob = await response.blob();
    const extension = blob.type === "image/png"
      ? "png"
      : blob.type === "image/webp"
        ? "webp"
        : "jpg";

    payload.append(fieldName, blob, `${namePrefix}-${index + 1}.${extension}`);
  }

  async function appendVariantImages(payload, sourceVariants) {
    let uploadIndex = 0;
    const resolved = [];

    for (const variant of sourceVariants) {
      const images = [];

      for (const image of variant.images || []) {
        if (String(image || "").startsWith("data:image/")) {
          await appendDataImage(payload, image, uploadIndex, "variantImages", "variant-image");
          images.push(`upload:${uploadIndex}`);
          uploadIndex += 1;
        } else if (image) {
          images.push(image);
        }
      }

      resolved.push({ ...variant, images });
    }

    return resolved;
  }

  async function appendEditImages(event) {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) {
      return;
    }

    try {
      const slots = Math.max(0, 8 - editForm.images.length);
      const previews = await Promise.all(files.slice(0, slots).map(readImageFile));
      updateEditImages([...editForm.images, ...previews].slice(0, 8));
    } catch (error) {
      toast.error(error.message || "Unable to read image");
    } finally {
      event.target.value = "";
    }
  }

  async function replaceEditImage(index, event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const preview = await readImageFile(file);
      updateEditImages(
        editForm.images.map((image, currentIndex) =>
          currentIndex === index ? preview : image
        )
      );
    } catch (error) {
      toast.error(error.message || "Unable to read image");
    } finally {
      event.target.value = "";
    }
  }

  function removeEditImage(index) {
    updateEditImages(
      editForm.images.filter((_, currentIndex) => currentIndex !== index)
    );
  }

  function updateEditSize(index, field, value) {
    setEditForm(previous => ({
      ...previous,
      variants: previous.variants.map((size, currentIndex) =>
        currentIndex === index
          ? {
              ...size,
              [field]: value
            }
          : size
      )
    }));
  }

  function addEditSizeRow() {
    setEditForm(previous => ({
      ...previous,
      variants: [
        ...previous.variants,
        {
          id: "",
          size: "",
          price: "",
          stock: "",
          images: []
        }
      ]
    }));
  }

  function removeEditSizeRow(index) {
    setEditForm(previous => ({
      ...previous,
      variants:
        previous.variants.length === 1
          ? previous.variants
          : previous.variants.filter((_, currentIndex) =>
              currentIndex !== index
            )
    }));
  }

  async function appendEditVariantImages(index, event) {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) {
      return;
    }

    try {
      const currentImages = editForm.variants[index]?.images || [];
      const slots = Math.max(0, 8 - currentImages.length);
      const previews = await Promise.all(
        files.slice(0, slots).map(readImageFile)
      );

      updateEditSize(index, "images", [...currentImages, ...previews].slice(0, 8));
    } catch (error) {
      toast.error(error.message || "Unable to read image");
    } finally {
      event.target.value = "";
    }
  }

  function removeEditVariantImage(variantIndex, imageIndex) {
    const images = editForm.variants[variantIndex]?.images || [];
    updateEditSize(
      variantIndex,
      "images",
      images.filter((_, currentIndex) => currentIndex !== imageIndex)
    );
  }

  function moveEditVariantImage(variantIndex, imageIndex, direction) {
    const images = [...(editForm.variants[variantIndex]?.images || [])];
    const target = imageIndex + direction;

    if (target < 0 || target >= images.length) {
      return;
    }

    [images[imageIndex], images[target]] = [images[target], images[imageIndex]];
    updateEditSize(variantIndex, "images", images);
  }

  async function saveProductEdit(event) {
    event.preventDefault();

    if (!editingProduct || !editForm || isSavingEdit) {
      return;
    }

    if (!editForm.name.trim()) {
      toast.error("Product name is required");
      return;
    }

    const parsedPrice = Number(editForm.price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      toast.error("Please enter a valid base price");
      return;
    }

    const parsedStock = Number(editForm.stock);
    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      toast.error("Please enter a valid base stock quantity");
      return;
    }

    try {
      setIsSavingEdit(true);

      const payload = new FormData();
      ["name", "price", "discountPercent", "category", "description", "stock", "stockStatus", "image"].forEach(field => {
        payload.append(field, String(editForm[field] ?? ""));
      });

      const resolvedVariants = await appendVariantImages(payload, editForm.variants);
      payload.append(
        "variants",
        JSON.stringify(resolvedVariants
          .filter(size =>
            size.size.trim()
          )
          .map(size => ({
            id: size.id ? Number(size.id) : undefined,
            price:
              size.price === ""
                ? Number(editForm.price || 0)
                : Number(size.price),
            size: size.size.trim(),
            stock:
              size.stock === ""
                ? Number(editForm.stock || 0)
                : Number(size.stock),
            images: size.images || []
          }))
        )
      );

      const imageOrder = [];
      for (const [index, image] of editForm.images.entries()) {
        if (String(image || "").startsWith("data:image/")) {
          imageOrder.push(`upload:${imageOrder.filter(item => item.startsWith("upload:")).length}`);
          await appendDataImage(payload, image, index);
        } else if (image) {
          imageOrder.push(image);
        }
      }
      payload.append("image_order", JSON.stringify(imageOrder));

      const response = await fetch(
        getApiUrl(`/api/products/${editingProduct.id}`),
        {
          method: "PUT",
          credentials: "include",
          body: payload
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to update product"
        );
      }

      setProducts(previous =>
        previous.map(product =>
          String(product.id) === String(editingProduct.id)
            ? data.product
            : product
        )
      );

      toast.success("Product updated successfully");
      closeEditProduct();
    } catch (error) {
      toast.error(error.message || "Failed to update product");
    } finally {
      setIsSavingEdit(false);
    }
  }

  const availableCategories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();

  const filteredProducts = products.filter(product => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      String(product.name || "").toLowerCase().includes(q) ||
      String(product.category || "").toLowerCase().includes(q) ||
      String(product.description || "").toLowerCase().includes(q);

    const matchesCategory =
      categoryFilter === "all" ||
      String(product.category || "").toLowerCase() === categoryFilter.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="admin-page">
      {/* HEADER */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Manage Products</h1>
          <p className="admin-page-subtitle">
            Catalog overview · Total Products: {products.length}
          </p>
        </div>
        <button
          type="button"
          className="admin-primary-action-btn"
          onClick={() => navigate("/admin/add-product")}
        >
          <FaPlus /> Add New Product
        </button>
      </div>

      {/* SEARCH & CATEGORY FILTER */}
      <div className="admin-order-controls-bar">
        <div className="admin-search-box-form admin-search-box-form--no-submit">
          <FaSearch className="admin-search-input-icon" />
          <input
            type="text"
            placeholder="Search products by title, category, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="admin-search-clear-inline"
              onClick={() => setSearchQuery("")}
            >
              <FaTimes />
            </button>
          )}
        </div>

        {availableCategories.length > 0 && (
          <div className="admin-payment-filter-wrapper">
            <label htmlFor="admin-cat-filter" className="admin-filter-label">
              <FaFilter /> Category:
            </label>
            <select
              id="admin-cat-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="admin-select-filter"
            >
              <option value="all">All Categories</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}

        {(searchQuery || categoryFilter !== "all") && (
          <button
            type="button"
            className="admin-clear-all-filters-btn"
            onClick={() => {
              setSearchQuery("");
              setCategoryFilter("all");
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* LOADING */}
      {isLoading ? (
        <div className="admin-loading-card">
          <p>Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="admin-empty-box">
          <h2>No Products Found</h2>
          <p>Products added to the catalog will appear here.</p>
          <button
            type="button"
            className="empty-btn"
            onClick={() => navigate("/admin/add-product")}
          >
            <FaPlus /> Add First Product
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="admin-empty-box">
          <h2>No Matching Products</h2>
          <p>No products match your current search or category filter.</p>
          <button
            type="button"
            className="empty-btn"
            onClick={() => {
              setSearchQuery("");
              setCategoryFilter("all");
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="admin-products-grid">
          {filteredProducts.map(product => {
            const isOutOfStock =
              product.stockStatus === "out_of_stock" ||
              product.stock_status === "out_of_stock" ||
              (Number(product.stock || 0) <= 0 && (!product.variants || product.variants.length === 0));

            return (
              <div key={product.id} className="admin-product-card">
                {/* IMAGE */}
                <div className="admin-card-image-frame admin-product-image-frame">
                  <img
                    src={getPrimaryImage(product) || PRODUCT_PLACEHOLDER}
                    alt={product.name}
                    loading="lazy"
                    onError={handleImageFallback}
                  />
                </div>

                {/* BADGE ROW */}
                <div className="admin-badge-row">
                  <span className="admin-category-badge">{product.category || "Uncategorized"}</span>
                  {isOutOfStock ? (
                    <span className="admin-status-badge admin-status-badge--out-of-stock">
                      Out of Stock
                    </span>
                  ) : (
                    <span className="admin-status-badge admin-status-badge--in-stock">
                      In Stock ({product.stock ?? 0})
                    </span>
                  )}
                </div>

                {/* INFO */}
                <div className="admin-product-info">
                  <h3 className="admin-product-name">{product.name}</h3>

                  <div className="admin-product-price-row">
                    {product.discountPercent > 0 ? (
                      <>
                        <span className="old-price">₹{Number(product.price).toFixed(2)}</span>
                        <strong className="current-price">₹{Number(product.discountedPrice).toFixed(2)}</strong>
                        <span className="discount-badge">{product.discountPercent}% OFF</span>
                      </>
                    ) : (
                      <strong className="current-price">₹{Number(product.price).toFixed(2)}</strong>
                    )}
                  </div>

                  {product.variants?.length > 0 && (
                    <div className="admin-product-variants-summary">
                      <strong>Variants ({product.variants.length}):</strong>
                      <p>
                        {product.variants
                          .map(v => `${v.size || v.size_label || "Variant"}: ₹${Number(v.price).toFixed(2)} (Stock: ${v.stock ?? 0})`)
                          .join(" • ")}
                      </p>
                    </div>
                  )}

                  {product.description && (
                    <p className="admin-product-description">
                      {product.description.slice(0, 95)}
                      {product.description.length > 95 ? "…" : ""}
                    </p>
                  )}
                </div>

                {/* ACTIONS */}
                <div className="admin-product-actions">
                  <button
                    type="button"
                    className="admin-action-btn admin-action-btn--edit"
                    onClick={() => openEditProduct(product)}
                  >
                    <FaEdit /> Edit Product
                  </button>

                  <button
                    type="button"
                    className={`admin-action-btn ${isOutOfStock ? "admin-action-btn--restock" : "admin-action-btn--stock-out"}`}
                    onClick={() => toggleStockStatus(product)}
                    disabled={stockUpdatingId === product.id}
                  >
                    {stockUpdatingId === product.id ? (
                      "Updating..."
                    ) : isOutOfStock ? (
                      <>
                        <FaCheckCircle /> Mark In Stock
                      </>
                    ) : (
                      <>
                        <FaTimesCircle /> Mark Out of Stock
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="admin-action-btn admin-action-btn--delete"
                    onClick={() => setProductToDelete(product)}
                    disabled={isDeleting && productToDelete?.id === product.id}
                  >
                    <FaTrash /> Delete Permanently
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {editingProduct && editForm && (
        <div className="admin-modal-backdrop">
          <form
            className="admin-edit-modal"
            onSubmit={saveProductEdit}
          >
            <div className="admin-edit-header">
              <h2>Edit Product: {editingProduct.name}</h2>
              <button
                type="button"
                className="admin-edit-close"
                onClick={closeEditProduct}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="admin-edit-body">
              {/* GROUP 1: BASIC INFORMATION */}
              <section className="admin-edit-section">
                <h3 className="admin-section-heading">Basic Information</h3>
                <div className="admin-edit-grid">
                  <label className="admin-edit-field">
                    <span>Product Name *</span>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(event) =>
                        updateEditField("name", event.target.value)
                      }
                      placeholder="e.g. Handcrafted Wooden Vase"
                      required
                    />
                  </label>

                  <label className="admin-edit-field">
                    <span>Category *</span>
                    <input
                      type="text"
                      value={editForm.category}
                      onChange={(event) =>
                        updateEditField("category", event.target.value)
                      }
                      placeholder="e.g. Home Decor"
                      required
                    />
                  </label>
                </div>

                <label className="admin-edit-field admin-edit-field--full">
                  <span>Description</span>
                  <textarea
                    rows="3"
                    value={editForm.description}
                    onChange={(event) =>
                      updateEditField("description", event.target.value)
                    }
                    placeholder="Provide a detailed description of the product..."
                  />
                </label>
              </section>

              {/* GROUP 2: PRICING */}
              <section className="admin-edit-section">
                <h3 className="admin-section-heading">Pricing</h3>
                <div className="admin-edit-grid">
                  <label className="admin-edit-field">
                    <span>Base Price (₹) *</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.price}
                      onChange={(event) =>
                        updateEditField("price", event.target.value)
                      }
                      placeholder="e.g. 1499.00"
                      required
                    />
                    <small className="admin-field-helper">
                      Standard catalog price. Overridden by variant price if specified.
                    </small>
                  </label>

                  <label className="admin-edit-field">
                    <span>Discount Percentage (%)</span>
                    <input
                      type="number"
                      value={editForm.discountPercent}
                      onChange={(event) =>
                        updateEditField("discountPercent", event.target.value)
                      }
                      placeholder="0 - 90"
                      min="0"
                      max="90"
                    />
                    <small className="admin-field-helper">
                      Optional promotional discount applied at checkout.
                    </small>
                  </label>
                </div>
              </section>

              {/* GROUP 3: INVENTORY & AVAILABILITY */}
              <section className="admin-edit-section">
                <h3 className="admin-section-heading">Inventory & Availability</h3>
                <div className="admin-edit-grid">
                  <label className="admin-edit-field">
                    <span>Base Stock Quantity *</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editForm.stock}
                      onChange={(event) =>
                        updateEditField("stock", event.target.value)
                      }
                      placeholder="e.g. 50"
                      required
                    />
                    <small className="admin-field-helper">
                      Available units for the base product.
                    </small>
                  </label>

                  <label className="admin-edit-field">
                    <span>Stock Status</span>
                    <select
                      value={editForm.stockStatus}
                      onChange={(event) =>
                        updateEditField("stockStatus", event.target.value)
                      }
                    >
                      <option value="in_stock">In Stock (Available for purchase)</option>
                      <option value="out_of_stock">Out of Stock (Temporarily unavailable)</option>
                    </select>
                    <small className="admin-field-helper">
                      Customers cannot purchase items marked out of stock.
                    </small>
                  </label>
                </div>
              </section>

              {/* GROUP 4: PRODUCT VARIANTS */}
              <section className="admin-edit-section">
                <div className="variant-builder-header">
                  <h3 className="admin-section-heading">Product Variants (Sizes / Dimensions)</h3>
                  <button
                    type="button"
                    className="admin-variant-add-btn"
                    onClick={addEditSizeRow}
                  >
                    + Add Size Variant
                  </button>
                </div>
                <p className="variant-helper-text">
                  Configure specific sizes, prices, and stock quantities. Variant prices and stock take precedence over base values.
                </p>

                <div className="variant-rows-container">
                  {editForm.variants.map((size, index) => (
                    <div key={index} className="admin-variant-card">
                      <div className="admin-variant-grid">
                        <label className="admin-edit-field">
                          <span>Size / Dimension Label</span>
                          <input
                            type="text"
                            value={size.size}
                            onChange={(event) =>
                              updateEditSize(index, "size", event.target.value)
                            }
                            placeholder="e.g. 12 x 8 Inches"
                          />
                        </label>

                        <label className="admin-edit-field">
                          <span>Variant Price (₹)</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={size.price}
                            onChange={(event) =>
                              updateEditSize(index, "price", event.target.value)
                            }
                            placeholder={`Base: ₹${editForm.price || 0}`}
                          />
                        </label>

                        <label className="admin-edit-field">
                          <span>Variant Stock</span>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={size.stock}
                            onChange={(event) =>
                              updateEditSize(index, "stock", event.target.value)
                            }
                            placeholder={`Base: ${editForm.stock || 0}`}
                          />
                        </label>

                        <div className="admin-variant-remove-box">
                          <button
                            type="button"
                            className="variant-remove-btn"
                            onClick={() => removeEditSizeRow(index)}
                          >
                            Remove Variant
                          </button>
                        </div>
                      </div>

                      {/* Variant Images */}
                      <div className="variant-image-manager">
                        <div className="variant-image-manager-header">
                          <strong>Variant Specific Images ({(size.images || []).length}/8)</strong>
                          <label className="variant-image-upload-label">
                            Upload Images
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              multiple
                              onChange={(event) => appendEditVariantImages(index, event)}
                              disabled={(size.images || []).length >= 8}
                            />
                          </label>
                        </div>

                        {(size.images || []).length > 0 && (
                          <div className="variant-image-thumbs">
                            {(size.images || []).map((preview, imageIndex) => (
                              <div key={`${preview}-${imageIndex}`} className="variant-image-thumb">
                                <img
                                  src={preview || PRODUCT_PLACEHOLDER}
                                  alt={`Variant preview ${imageIndex + 1}`}
                                  loading="lazy"
                                  onError={handleImageFallback}
                                />
                                <div className="variant-image-actions">
                                  <button
                                    type="button"
                                    onClick={() => moveEditVariantImage(index, imageIndex, -1)}
                                    disabled={imageIndex === 0}
                                  >
                                    ←
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveEditVariantImage(index, imageIndex, 1)}
                                    disabled={imageIndex === (size.images || []).length - 1}
                                  >
                                    →
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeEditVariantImage(index, imageIndex)}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* GROUP 5: PRODUCT IMAGES */}
              <section className="admin-edit-section">
                <h3 className="admin-section-heading">Product Gallery ({editForm.images.length}/8)</h3>

                <div className="admin-edit-gallery">
                  {editForm.images.map((image, index) => (
                    <div key={`${image}-${index}`} className="admin-edit-gallery-item">
                      <img
                        src={image || PRODUCT_PLACEHOLDER}
                        alt={`Product gallery ${index + 1}`}
                        loading="lazy"
                        onError={handleImageFallback}
                      />
                      <div className="admin-edit-gallery-actions">
                        <label className="admin-gallery-replace-btn">
                          Replace
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(event) => replaceEditImage(index, event)}
                          />
                        </label>
                        <button
                          type="button"
                          className="admin-gallery-delete-btn"
                          onClick={() => removeEditImage(index)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="admin-gallery-tools">
                  <label className="admin-upload-more">
                    + Upload Images ({editForm.images.length}/8)
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={appendEditImages}
                      disabled={editForm.images.length >= 8}
                    />
                  </label>

                  <label className="admin-edit-field admin-edit-field--url">
                    <span>Or Primary Image URL</span>
                    <input
                      type="text"
                      value={editForm.image}
                      onChange={(event) =>
                        updateEditField("image", event.target.value)
                      }
                      placeholder="https://... image URL"
                    />
                  </label>
                </div>
              </section>
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-modal-cancel"
                onClick={closeEditProduct}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="admin-modal-save"
                disabled={isSavingEdit}
              >
                {isSavingEdit ? "Saving Changes..." : "Save Product Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONFIRMATION DIALOG FOR PERMANENT DELETION */}
      <ConfirmModal
        isOpen={productToDelete !== null}
        title="Delete Product Permanently"
        message={
          productToDelete
            ? `Are you sure you want to permanently delete "${productToDelete.name}" from the active catalog?\n\nThis action cannot be undone. Historical completed customer orders will remain valid and intact with their original purchased item details, but this product will no longer appear in the catalog.`
            : ""
        }
        cancelText="Keep Product"
        confirmText={isDeleting ? "Deleting..." : "Delete Permanently"}
        danger
        onCancel={() => setProductToDelete(null)}
        onConfirm={deleteProductPermanently}
      />
    </div>
  );
}

export default AdminProducts;

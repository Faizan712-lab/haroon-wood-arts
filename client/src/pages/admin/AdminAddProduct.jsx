import "./Admin.css";

import {
  useState,
  useEffect
} from "react";

import toast from "react-hot-toast";

import {
  getApiUrl
} from "../../utils/api";

function AdminAddProduct() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [stock, setStock] = useState("50");
  const [stockStatus, setStockStatus] = useState("in_stock");
  const [productImages, setProductImages] = useState([]);
  const [variants, setVariants] = useState([
    {
      size: "",
      price: "",
      stock: "",
      images: []
    }
  ]);

  const [categories, setCategories] = useState([]);

  /* CATEGORY CREATION */
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryImage, setNewCategoryImage] = useState("");
  const [newCategoryImageFile, setNewCategoryImageFile] = useState(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  /* LOAD CATEGORIES */
  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch(getApiUrl("/api/categories"), {
          cache: "no-store"
        });

        const data = await response.json();
        if (response.ok && data.success) {
          setCategories(data.categories || []);
          return;
        }
      } catch (error) {
        console.error("Failed to load product categories:", error);
      }
      setCategories([]);
    }

    loadCategories();
  }, []);

  /* PRODUCT IMAGE HELPERS */
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

      resolve({
        file,
        preview: URL.createObjectURL(file)
      });
    });
  }

  function readImageDataUrl(file) {
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

  async function appendVariantImages(payload, sourceVariants) {
    let uploadIndex = 0;
    const resolved = [];

    for (const variant of sourceVariants) {
      const images = [];

      for (const image of variant.images || []) {
        if (String(image || "").startsWith("data:image/")) {
          const response = await fetch(image);
          const blob = await response.blob();
          const extension = blob.type === "image/png"
            ? "png"
            : blob.type === "image/webp"
              ? "webp"
              : "jpg";
          payload.append("variantImages", blob, `variant-image-${uploadIndex + 1}.${extension}`);
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

  async function handleImage(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      const slots = Math.max(0, 8 - productImages.length);
      const previews = await Promise.all(
        files.slice(0, slots).map(readImageFile)
      );

      setProductImages(previous => [...previous, ...previews].slice(0, 8));
    } catch (error) {
      toast.error(error.message || "Unable to read image");
    } finally {
      e.target.value = "";
    }
  }

  function removeProductImage(index) {
    setProductImages(previous => previous.filter((_, currentIndex) => currentIndex !== index));
  }

  function moveProductImage(index, direction) {
    setProductImages(previous => {
      const next = [...previous];
      const target = index + direction;

      if (target < 0 || target >= next.length) {
        return previous;
      }

      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  /* CATEGORY IMAGE */
  function handleCategoryImage(e) {
    const file = e.target.files[0];
    if (!file) return;

    setNewCategoryImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewCategoryImage(reader.result);
    };
    reader.readAsDataURL(file);
  }

  /* ADD CATEGORY */
  async function handleAddCategory() {
    if (!newCategoryName.trim() || !newCategoryImage) {
      toast.error("Please provide both category name and image");
      return;
    }

    try {
      setIsAddingCategory(true);
      const payload = new FormData();
      payload.append("name", newCategoryName.trim());

      if (newCategoryImageFile) {
        payload.append("images", newCategoryImageFile);
      }

      const response = await fetch(getApiUrl("/api/categories"), {
        method: "POST",
        credentials: "include",
        body: payload
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to add category");
      }

      setCategories(previous => {
        const withoutDuplicate = previous.filter(item =>
          item.name.toLowerCase() !== data.category.name.toLowerCase()
        );
        return [...withoutDuplicate, data.category];
      });

      setCategory(newCategoryName.trim());
      setNewCategoryName("");
      setNewCategoryImage("");
      setNewCategoryImageFile(null);

      toast.success("Category added successfully");
    } catch (error) {
      toast.error(error.message || "Failed to add category");
    } finally {
      setIsAddingCategory(false);
    }
  }

  /* VARIANT HELPERS */
  function updateSize(index, field, value) {
    setVariants(previous =>
      previous.map((size, currentIndex) =>
        currentIndex === index
          ? {
              ...size,
              [field]: value
            }
          : size
      )
    );
  }

  function addSizeRow() {
    setVariants(previous => [
      ...previous,
      {
        size: "",
        price: "",
        stock: "",
        images: []
      }
    ]);
  }

  function removeSizeRow(index) {
    setVariants(previous =>
      previous.length === 1
        ? previous
        : previous.filter((_, currentIndex) => currentIndex !== index)
    );
  }

  async function addVariantImages(index, event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    try {
      const currentImages = variants[index]?.images || [];
      const slots = Math.max(0, 8 - currentImages.length);
      const images = await Promise.all(
        files.slice(0, slots).map(readImageDataUrl)
      );

      updateSize(index, "images", [...currentImages, ...images].slice(0, 8));
    } catch (error) {
      toast.error(error.message || "Unable to read image");
    } finally {
      event.target.value = "";
    }
  }

  function removeVariantImage(variantIndex, imageIndex) {
    const images = variants[variantIndex]?.images || [];
    updateSize(
      variantIndex,
      "images",
      images.filter((_, currentIndex) => currentIndex !== imageIndex)
    );
  }

  function moveVariantImage(variantIndex, imageIndex, direction) {
    const images = [...(variants[variantIndex]?.images || [])];
    const target = imageIndex + direction;

    if (target < 0 || target >= images.length) return;

    [images[imageIndex], images[target]] = [images[target], images[imageIndex]];
    updateSize(variantIndex, "images", images);
  }

  /* ADD PRODUCT SUBMIT */
  async function handleAddProduct(e) {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a product name");
      return;
    }

    if (!category) {
      toast.error("Please select a product category");
      return;
    }

    const parsedBasePrice = Number(price);
    if (!Number.isFinite(parsedBasePrice) || parsedBasePrice < 0) {
      toast.error("Please enter a valid base price");
      return;
    }

    const parsedBaseStock = Number(stock);
    if (!Number.isInteger(parsedBaseStock) || parsedBaseStock < 0) {
      toast.error("Please enter a valid base stock quantity");
      return;
    }

    if (productImages.length === 0) {
      toast.error("Please upload at least one product image");
      return;
    }

    try {
      setIsAddingProduct(true);

      const payload = new FormData();
      payload.append("name", name.trim());
      payload.append("price", String(parsedBasePrice));
      payload.append("discountPercent", String(discountPercent || 0));
      payload.append("category", category);
      payload.append("description", description || "");
      payload.append("stock", String(parsedBaseStock));
      payload.append("stockStatus", stockStatus);

      const resolvedVariants = await appendVariantImages(payload, variants);
      payload.append(
        "variants",
        JSON.stringify(
          resolvedVariants
            .filter(variant => variant.size.trim())
            .map(variant => ({
              size: variant.size.trim(),
              price:
                variant.price === ""
                  ? parsedBasePrice
                  : Number(variant.price),
              stock:
                variant.stock === ""
                  ? parsedBaseStock
                  : Number(variant.stock),
              images: variant.images || []
            }))
        )
      );

      productImages.forEach(item => {
        payload.append("images", item.file);
      });

      const response = await fetch(getApiUrl("/api/products"), {
        method: "POST",
        credentials: "include",
        body: payload
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Product added successfully to catalog!");

        // Reset form to defaults
        setName("");
        setPrice("");
        setDiscountPercent("");
        setCategory("");
        setDescription("");
        setStock("50");
        setProductImages([]);
        setVariants([
          {
            size: "",
            price: "",
            stock: "",
            images: []
          }
        ]);
        setStockStatus("in_stock");
      } else {
        toast.error(data.message || "Failed to add product");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to add product");
    } finally {
      setIsAddingProduct(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Add New Product</h1>
          <p className="admin-page-subtitle">
            Create and publish a handcrafted product to the Haroon Stores catalog.
          </p>
        </div>
      </div>

      {/* QUICK CATEGORY CREATION */}
      <div className="admin-quick-category-box">
        <div className="admin-quick-category-header">
          <h3>Need a new category?</h3>
          <p>Create a category here before assigning it to your product.</p>
        </div>
        <div className="admin-quick-category-row">
          <input
            type="text"
            placeholder="New Category Name (e.g. Wall Art)"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <label className="admin-upload-category-label">
            {newCategoryImageFile ? "Image Selected ✓" : "Choose Image"}
            <input
              type="file"
              accept="image/*"
              onChange={handleCategoryImage}
            />
          </label>
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={handleAddCategory}
            disabled={isAddingCategory}
          >
            {isAddingCategory ? "Saving..." : "+ Add Category"}
          </button>
        </div>
      </div>

      {/* PRODUCT FORM */}
      <form className="admin-product-form" onSubmit={handleAddProduct}>
        {/* GROUP 1: BASIC INFORMATION */}
        <section className="admin-form-group">
          <h2 className="admin-group-title">1. Basic Information</h2>
          <div className="admin-form-row admin-form-row--two">
            <label className="admin-input-label">
              <span>Product Name *</span>
              <input
                type="text"
                placeholder="e.g. Handcrafted Rosewood Jewelry Box"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>

            <label className="admin-input-label">
              <span>Category *</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="">-- Select a Category --</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="admin-input-label admin-input-label--full">
            <span>Description</span>
            <textarea
              rows="3"
              placeholder="Describe the craftsmanship, material, wood type, and details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </section>

        {/* GROUP 2: PRICING */}
        <section className="admin-form-group">
          <h2 className="admin-group-title">2. Pricing</h2>
          <div className="admin-form-row admin-form-row--two">
            <label className="admin-input-label">
              <span>Base Price (₹) *</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 1999.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
              <span className="admin-input-help">
                Default selling price when no specific variant price is provided.
              </span>
            </label>

            <label className="admin-input-label">
              <span>Discount Percentage (%)</span>
              <input
                type="number"
                placeholder="0 - 90"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                min="0"
                max="90"
              />
              <span className="admin-input-help">
                Optional discount applied to this item at checkout.
              </span>
            </label>
          </div>
        </section>

        {/* GROUP 3: INVENTORY & AVAILABILITY */}
        <section className="admin-form-group">
          <h2 className="admin-group-title">3. Inventory & Availability</h2>
          <div className="admin-form-row admin-form-row--two">
            <label className="admin-input-label">
              <span>Base Stock Quantity *</span>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="e.g. 50"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                required
              />
              <span className="admin-input-help">
                Total units available for order.
              </span>
            </label>

            <label className="admin-input-label">
              <span>Catalog Stock Status</span>
              <select
                value={stockStatus}
                onChange={(event) => setStockStatus(event.target.value)}
              >
                <option value="in_stock">In Stock (Available for purchase)</option>
                <option value="out_of_stock">Out of Stock (Shown as unavailable)</option>
              </select>
              <span className="admin-input-help">
                You can easily toggle stock availability anytime in Manage Products.
              </span>
            </label>
          </div>
        </section>

        {/* GROUP 4: VARIANTS */}
        <section className="admin-form-group">
          <div className="admin-group-header">
            <div>
              <h2 className="admin-group-title">4. Product Variants (Optional)</h2>
              <p className="admin-group-subtext">
                Add dimensions or sizes. Variant price and stock override base values.
              </p>
            </div>
            <button
              type="button"
              className="admin-variant-add-btn"
              onClick={addSizeRow}
            >
              + Add Size Variant
            </button>
          </div>

          <div className="admin-variants-list">
            {variants.map((variant, index) => (
              <div key={index} className="admin-variant-card">
                <div className="admin-variant-grid">
                  <label className="admin-input-label">
                    <span>Size / Dimension Label</span>
                    <input
                      type="text"
                      placeholder="e.g. 10 x 6 x 4 Inches"
                      value={variant.size}
                      onChange={(e) => updateSize(index, "size", e.target.value)}
                    />
                  </label>

                  <label className="admin-input-label">
                    <span>Variant Price (₹)</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={`Base: ₹${price || 0}`}
                      value={variant.price}
                      onChange={(e) => updateSize(index, "price", e.target.value)}
                    />
                  </label>

                  <label className="admin-input-label">
                    <span>Variant Stock</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder={`Base: ${stock || 0}`}
                      value={variant.stock}
                      onChange={(e) => updateSize(index, "stock", e.target.value)}
                    />
                  </label>

                  <div className="admin-variant-remove-box">
                    <button
                      type="button"
                      className="variant-remove-btn"
                      onClick={() => removeSizeRow(index)}
                      disabled={variants.length === 1 && !variant.size}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Variant Images */}
                <div className="variant-image-manager">
                  <div className="variant-image-manager-header">
                    <strong>Variant Photos ({(variant.images || []).length}/8)</strong>
                    <label className="variant-image-upload-label">
                      + Add Photos
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={(event) => addVariantImages(index, event)}
                        disabled={(variant.images || []).length >= 8}
                      />
                    </label>
                  </div>

                  {(variant.images || []).length > 0 && (
                    <div className="variant-image-thumbs">
                      {(variant.images || []).map((preview, imageIndex) => (
                        <div key={`${preview}-${imageIndex}`} className="variant-image-thumb">
                          <img
                            src={preview}
                            alt={`Variant preview ${imageIndex + 1}`}
                            loading="lazy"
                          />
                          <div className="variant-image-actions">
                            <button
                              type="button"
                              onClick={() => moveVariantImage(index, imageIndex, -1)}
                              disabled={imageIndex === 0}
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              onClick={() => moveVariantImage(index, imageIndex, 1)}
                              disabled={imageIndex === (variant.images || []).length - 1}
                            >
                              →
                            </button>
                            <button
                              type="button"
                              onClick={() => removeVariantImage(index, imageIndex)}
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
        <section className="admin-form-group">
          <div className="admin-group-header">
            <div>
              <h2 className="admin-group-title">5. Product Gallery Photos</h2>
              <p className="admin-group-subtext">
                Upload up to 8 high quality photos showing multiple angles of the product.
              </p>
            </div>
            <span className="admin-image-count-pill">{productImages.length}/8 uploaded</span>
          </div>

          <label className="admin-file-dropzone">
            <span className="admin-dropzone-icon">📷</span>
            <span className="admin-dropzone-text">Click or drag images to upload</span>
            <span className="admin-dropzone-hint">PNG, JPG or WEBP (Max 5MB each)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImage}
              disabled={productImages.length >= 8}
            />
          </label>

          {productImages.length > 0 && (
            <div className="admin-image-thumbs">
              {productImages.map((preview, index) => (
                <div key={`${preview.preview}-${index}`} className="admin-image-thumb">
                  <img
                    src={preview.preview}
                    alt={`Product preview ${index + 1}`}
                    loading="lazy"
                  />
                  <div className="admin-image-thumb-actions">
                    <button
                      type="button"
                      onClick={() => moveProductImage(index, -1)}
                      disabled={index === 0}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => moveProductImage(index, 1)}
                      disabled={index === productImages.length - 1}
                    >
                      →
                    </button>
                    <button
                      type="button"
                      className="admin-image-thumb-remove"
                      onClick={() => removeProductImage(index)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SUBMIT BUTTON */}
        <div className="admin-form-submit-row">
          <button
            type="submit"
            className="admin-submit-btn"
            disabled={isAddingProduct}
          >
            {isAddingProduct ? "Publishing Product..." : "Publish Product to Catalog"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminAddProduct;

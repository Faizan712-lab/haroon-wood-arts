import "./Admin.css";

import {
  useEffect,
  useState
}
from "react";

import toast from "react-hot-toast";

import {
  getApiUrl
}
from "../../utils/api";

import {
  PRODUCT_PLACEHOLDER,
  getImageList,
  getPrimaryImage,
  handleImageFallback
}
from "../../utils/imageFallback";

import ConfirmModal from "../../components/ConfirmModal";

function AdminProducts() {

  const [products,
    setProducts] =
    useState([]);

  const [deleteProductId,
    setDeleteProductId] =
    useState(null);

  const [isDeleting,
    setIsDeleting] =
    useState(false);

  const [editingProduct,
    setEditingProduct] =
    useState(null);

  const [editForm,
    setEditForm] =
    useState(null);

  const [isSavingEdit,
    setIsSavingEdit] =
    useState(false);

  /* LOAD PRODUCTS */

  useEffect(() => {

    fetchProducts();

  }, []);

  async function fetchProducts() {

    try {

      const response = await fetch(
        getApiUrl("/api/products"),
        {
          cache: "no-store"
        }
      );

      const data =
        await response.json();

      if (response.ok && data.success) {

        setProducts(
          data.products
        );

      }

    } catch (error) {

      console.error(
        "Failed to load products:",
        error
      );

      setProducts([]);

    }

  }

  /* DELETE PRODUCT */

  async function deleteProduct() {
    const id = deleteProductId;

    if (!id || isDeleting)
      return;

    try {
      setIsDeleting(true);

      const response = await fetch(
        getApiUrl(`/api/products/${id}`),
        {
          method: "DELETE",
          credentials: "include"
        }
      );

      const data =
        await response.json();

      if (response.ok && data.success) {

        setProducts(
          products.filter(

            item =>
              String(item.id) !==
              String(id)

          )
        );

        toast.success(
          "Product deleted successfully"
        );

      } else {

        toast.error(
          data.message || "Failed to delete product"
        );

      }

    } catch (error) {

      console.error(
        "Failed to delete product:",
        error
      );

      toast.error(
        "Failed to delete product"
      );

    } finally {
      setIsDeleting(false);
      setDeleteProductId(null);
    }

  }

  function normalizeSizes(product) {
    const source =
      product.variants?.length > 0
        ? product.variants
        : product.sizes || [];

    return source.length > 0
      ? source.map(size => ({
          id: size.id || "",
          size: size.size || size.label || "",
          price:
            size.price === undefined ||
            size.price === null
              ? ""
              : String(size.price),
          stock:
            size.stock === undefined ||
            size.stock === null
              ? ""
              : String(size.stock),
          images:
            Array.isArray(size.images)
              ? size.images
              : []
        }))
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
      stock: product.stock || 100,
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

      const data =
        await response.json();

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

  return (

    <div className="admin-page">

      {/* HEADER */}

      <div className="admin-products-header">

        <div>

          <h1>
            Manage Products
          </h1>

          <p>
            Total Products:
            {" "}
            {products.length}
          </p>

        </div>

      </div>

      {/* EMPTY */}

      {products.length === 0 ? (

        <div className="admin-empty-box">

          <h2>
            No Products Found
          </h2>

          <p>
            Products added by admin
            will appear here.
          </p>

        </div>

      ) : (

        <div className="admin-products-grid">

          {products.map(product => (

            <div

              key={product.id}

              className="admin-product-card"

            >

              {/* IMAGE */}

              <div className="admin-card-image-frame admin-product-image-frame">
                <img

                  src={getPrimaryImage(product) || PRODUCT_PLACEHOLDER}

                  alt={product.name}
                  loading="lazy"

                  onError={handleImageFallback}

                />
              </div>

              {/* CATEGORY */}

              <div className="admin-category-badge">

                {product.category}

              </div>

              {/* INFO */}

              <div className="admin-product-info">

                <h3>
                  {product.name}
                </h3>

                <p className="admin-product-price">

                  {product.discountPercent > 0 ? (
                    <>
                      <span className="old-price">
                        Rs. {product.price}
                      </span>
                      Rs. {product.discountedPrice}
                      <span className="discount-badge">
                        {product.discountPercent}% OFF
                      </span>
                    </>
                  ) : (
                    <>Rs. {product.price}</>
                  )}

                </p>

                {product.variants?.length > 0 && (
                  <p className="admin-product-description">
                    Variants:
                    {" "}
                    {product.variants
                      .map(size =>
                        `${size.size || size.label} - Rs. ${size.price}`
                      )
                      .join(", ")}
                  </p>
                )}

                <p className="admin-product-description">

                  {product.description
                    ?.slice(0, 80)}

                  ...

                </p>

              </div>

              {/* ACTIONS */}

              <div className="admin-product-actions">

                <button

                  className="edit-btn"

                  onClick={() =>

                    openEditProduct(product)

                  }

                >

                  Edit Product

                </button>

                <button

                  className="delete-btn"

                  onClick={() =>

                    setDeleteProductId(product.id)

                  }
                  disabled={
                    isDeleting &&
                    String(deleteProductId) ===
                    String(product.id)
                  }

                >

                  {isDeleting &&
                  String(deleteProductId) ===
                  String(product.id)
                    ? "Deleting..."
                    : "Delete Product"}

                </button>

              </div>

            </div>

          ))}

        </div>

      )}

      {editingProduct && editForm && (
        <div className="admin-modal-backdrop">
          <form
            className="admin-edit-modal"
            onSubmit={saveProductEdit}
          >
            <div className="admin-edit-header">
              <h2>
                Edit Product
              </h2>
            </div>

            <div className="admin-edit-body">
              <section className="admin-edit-section">
                <h3>
                  Basic Information
                </h3>

                <div className="admin-edit-grid">
                  <label>
                    Name
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(event) =>
                        updateEditField("name", event.target.value)
                      }
                      placeholder="Product name"
                      required
                    />
                  </label>

                  <label>
                    Category
                    <input
                      type="text"
                      value={editForm.category}
                      onChange={(event) =>
                        updateEditField("category", event.target.value)
                      }
                      placeholder="Category"
                      required
                    />
                  </label>

                </div>
              </section>

              <section className="admin-edit-section">
                <h3>
                  Pricing
                </h3>

                <div className="admin-edit-grid">
                  <div className="admin-edit-field-stack">
                    <label>
                      Base Price
                      <input
                        type="number"
                        value={editForm.price}
                        onChange={(event) =>
                          updateEditField("price", event.target.value)
                        }
                        placeholder="Base Price"
                        required
                      />
                    </label>
                    <span>
                      Used when no variant price is provided.
                    </span>
                  </div>

                  <label>
                    Discount
                    <input
                      type="number"
                      value={editForm.discountPercent}
                      onChange={(event) =>
                        updateEditField("discountPercent", event.target.value)
                      }
                      placeholder="Discount % (0-90)"
                      min="0"
                      max="90"
                    />
                  </label>

                  <label>
                    Stock Status
                    <select
                      value={editForm.stockStatus}
                      onChange={(event) =>
                        updateEditField("stockStatus", event.target.value)
                      }
                    >
                      <option value="in_stock">
                        In Stock
                      </option>
                      <option value="out_of_stock">
                        Out of Stock
                      </option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="admin-edit-section">
                <h3>
                  Description
                </h3>

                <label>
                  Description
                  <textarea
                    value={editForm.description}
                    onChange={(event) =>
                      updateEditField("description", event.target.value)
                    }
                    placeholder="Description"
                  />
                </label>
              </section>

              <section className="admin-edit-section">
                <h3>
                  Current Gallery
                </h3>

                <div className="admin-edit-gallery">
                  {editForm.images.map((image, index) => (
                    <div
                      key={`${image}-${index}`}
                      className="admin-edit-gallery-item"
                    >
                      <img
                        src={image || PRODUCT_PLACEHOLDER}
                        alt={`Product gallery ${index + 1}`}
                        loading="lazy"
                        onError={handleImageFallback}
                      />
                      <div className="admin-edit-gallery-actions">
                        <label>
                          Replace
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(event) =>
                              replaceEditImage(index, event)
                            }
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => removeEditImage(index)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <label className="admin-upload-more">
                  Upload More Images ({editForm.images.length}/8)
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={appendEditImages}
                    disabled={editForm.images.length >= 8}
                  />
                </label>

                <label>
                  Image URL
                    <input
                      type="text"
                      value={editForm.image}
                      onChange={(event) =>
                        updateEditField("image", event.target.value)
                      }
                      placeholder="Image URL or base64 image"
                    />
                </label>
              </section>

              <section className="admin-edit-section">
                <div className="variant-builder">
                  <div className="variant-builder-header">
                    <h3>
                      Product Variants
                    </h3>
                  </div>

                  <p className="variant-helper-text">
                    Variant Price overrides base price for this size.
                  </p>

                  <div className="variant-row variant-row-head">
                    <span>Size</span>
                    <span>Variant Price</span>
                    <span>Stock</span>
                    <span>Remove</span>
                  </div>

                  {editForm.variants.map((size, index) => (
                    <div
                      key={index}
                      className="variant-row"
                    >
                      <input
                        type="text"
                        value={size.size}
                        onChange={(event) =>
                          updateEditSize(index, "size", event.target.value)
                        }
                        placeholder="12 Inches"
                      />

                      <input
                        type="number"
                        value={size.price}
                        onChange={(event) =>
                          updateEditSize(index, "price", event.target.value)
                        }
                        placeholder="Variant Price"
                      />

                      <input
                        type="number"
                        value={size.stock}
                        onChange={(event) =>
                          updateEditSize(index, "stock", event.target.value)
                        }
                        placeholder="10"
                      />

                      <button
                        type="button"
                        className="variant-remove-btn"
                        onClick={() =>
                          removeEditSizeRow(index)
                        }
                      >
                        Delete
                      </button>

                      <div className="variant-image-manager">
                        <div className="variant-image-manager-header">
                          <strong>
                            Upload Images
                          </strong>
                          <span>
                            {(size.images || []).length}/8
                          </span>
                        </div>

                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={(event) =>
                            appendEditVariantImages(index, event)
                          }
                          disabled={(size.images || []).length >= 8}
                        />

                        {(size.images || []).length > 0 && (
                          <div className="variant-image-thumbs">
                            {(size.images || []).map((preview, imageIndex) => (
                              <div
                                key={`${preview}-${imageIndex}`}
                                className="variant-image-thumb"
                              >
                                <img
                                  src={preview || PRODUCT_PLACEHOLDER}
                                  alt={`Variant preview ${imageIndex + 1}`}
                                  loading="lazy"
                                  onError={handleImageFallback}
                                />
                                <div className="variant-image-actions">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      moveEditVariantImage(index, imageIndex, -1)
                                    }
                                    disabled={imageIndex === 0}
                                  >
                                    Up
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      moveEditVariantImage(index, imageIndex, 1)
                                    }
                                    disabled={imageIndex === (size.images || []).length - 1}
                                  >
                                    Down
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeEditVariantImage(index, imageIndex)
                                    }
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="variant-add-btn"
                    onClick={addEditSizeRow}
                  >
                    Add Variant
                  </button>
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
                {isSavingEdit ? "Saving..." : "Save Product"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteProductId !== null}
        title="Delete Product"
        message={"This action cannot be undone.\nAre you sure you want to delete this product?"}
        cancelText="Cancel"
        confirmText="Delete Product"
        danger
        onCancel={() =>
          setDeleteProductId(null)
        }
        onConfirm={deleteProduct}
      />

    </div>

  );

}

export default AdminProducts;

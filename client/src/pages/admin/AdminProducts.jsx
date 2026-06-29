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
          method: "DELETE"
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
              : String(size.stock)
        }))
      : [
          {
            id: "",
            size: "",
            price: "",
            stock: ""
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
      image: product.image || "",
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
          stock: ""
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

  async function saveProductEdit(event) {
    event.preventDefault();

    if (!editingProduct || !editForm || isSavingEdit) {
      return;
    }

    try {
      setIsSavingEdit(true);

      const payload = {
        ...editForm,
        variants: editForm.variants
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
                : Number(size.stock)
          }))
      };

      const response = await fetch(
        getApiUrl(`/api/products/${editingProduct.id}`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
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

                  src={product.image || PRODUCT_PLACEHOLDER}

                  alt={product.name}

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
                  Image Preview
                </h3>

                <div className="admin-edit-image-row">
                  <img
                    className="admin-edit-preview"
                    src={editForm.image || PRODUCT_PLACEHOLDER}
                    alt={editForm.name || "Product preview"}
                    onError={handleImageFallback}
                  />

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
                </div>
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

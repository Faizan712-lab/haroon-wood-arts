import "./Admin.css";

import {
  useState,
  useEffect
}
from "react";

import toast from "react-hot-toast";

import {
  getApiUrl
}
from "../../utils/api";

function AdminAddProduct() {

  const [name,
    setName] =
    useState("");

  const [price,
    setPrice] =
    useState("");

  const [discountPercent,
    setDiscountPercent] =
    useState("");

  const [category,
    setCategory] =
    useState("");

  const [description,
    setDescription] =
    useState("");

  const [image,
    setImage] =
    useState("");

  const [productImages,
    setProductImages] =
    useState([]);

  const [variants,
    setVariants] =
    useState([
      {
        size: "",
        price: "",
        stock: "",
        images: []
      }
    ]);

  const [stockStatus,
    setStockStatus] =
    useState("in_stock");

  const [categories,
    setCategories] =
    useState([]);

  /* CATEGORY CREATION */

  const [newCategoryName,
    setNewCategoryName] =
    useState("");

  const [newCategoryImage,
    setNewCategoryImage] =
    useState("");

  const [newCategoryImageFile,
    setNewCategoryImageFile] =
    useState(null);

  const [isAddingCategory,
    setIsAddingCategory] =
    useState(false);

  const [isAddingProduct,
    setIsAddingProduct] =
    useState(false);

  /* LOAD CATEGORIES */

  useEffect(() => {

    async function loadCategories() {

      try {

        const response = await fetch(
          getApiUrl("/api/categories"),
          {
            cache: "no-store"
          }
        );

        const data =
          await response.json();

        if (response.ok && data.success) {

          setCategories(data.categories || []);

          return;

        }

      } catch (error) {

        console.error(
          "Failed to load product categories:",
          error
        );

      }

      setCategories([]);

    }

    loadCategories();

  }, []);

  /* PRODUCT IMAGE */

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

    const files =
      Array.from(e.target.files || []);

    if (files.length === 0) return;

    try {
      const slots =
        Math.max(0, 8 - productImages.length);

      const previews =
        await Promise.all(
          files.slice(0, slots).map(readImageFile)
        );

      setProductImages(previous => {
        const next = [...previous, ...previews].slice(0, 8);
        setImage(next[0]?.preview || "");
        return next;
      });
    } catch (error) {
      toast.error(error.message || "Unable to read image");
    } finally {
      e.target.value = "";
    }
  }

  function removeProductImage(index) {
    setProductImages(previous => {
      const next = previous.filter((_, currentIndex) => currentIndex !== index);
      setImage(next[0]?.preview || "");
      return next;
    });
  }

  function moveProductImage(index, direction) {
    setProductImages(previous => {
      const next = [...previous];
      const target = index + direction;

      if (target < 0 || target >= next.length) {
        return previous;
      }

      [next[index], next[target]] = [next[target], next[index]];
      setImage(next[0]?.preview || "");
      return next;
    });
  }

  /* CATEGORY IMAGE */

  function handleCategoryImage(e) {

    const file =
      e.target.files[0];

    if (!file) return;

    setNewCategoryImageFile(file);

    const reader =
      new FileReader();

    reader.onloadend = () => {

      setNewCategoryImage(
        reader.result
      );

    };

    reader.readAsDataURL(
      file
    );

  }

  /* ADD CATEGORY */

  async function handleAddCategory() {

    if (

      !newCategoryName ||

      !newCategoryImage

    ) {

      toast.error(
        "Add category name and image"
      );

      return;

    }

    try {
      setIsAddingCategory(true);
      const payload = new FormData();
      payload.append("name", newCategoryName);

      if (newCategoryImageFile) {
        payload.append("images", newCategoryImageFile);
      }

      const response = await fetch(
        getApiUrl("/api/categories"),
        {
          method: "POST",
          credentials: "include",
          body: payload
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to add category"
        );
      }

      setCategories(previous => {
        const withoutDuplicate =
          previous.filter(item =>
            item.name.toLowerCase() !==
            data.category.name.toLowerCase()
          );

        return [
          ...withoutDuplicate,
          data.category
        ];
      });

      setCategory(newCategoryName);
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

  /* ADD PRODUCT */

  async function handleAddProduct(e) {

    e.preventDefault();

    if (!category) {

      toast.error(
        "Select category"
      );

      return;

    }

    try {
      setIsAddingProduct(true);

      const payload = new FormData();
      payload.append("name", name);
      payload.append("price", price);
      payload.append("discountPercent", discountPercent);
      payload.append("category", category);
      payload.append("description", description);
      payload.append("stock", "100");
      payload.append("stockStatus", stockStatus);
      const resolvedVariants = await appendVariantImages(payload, variants);
      payload.append(
        "variants",
        JSON.stringify(
          resolvedVariants
            .filter(variant =>
              variant.size.trim()
            )
            .map(variant => ({
              size: variant.size.trim(),
              price:
                variant.price === ""
                  ? Number(price || 0)
                  : Number(variant.price),
              stock:
                variant.stock === ""
                  ? 100
                  : Number(variant.stock),
              images: variant.images || []
            }))
        )
      );

      productImages.forEach(item => {
        payload.append("images", item.file);
      });

      const response = await fetch(
        getApiUrl("/api/products"),
        {
          method: "POST",
          credentials: "include",
          body: payload

        }
      );

      const data = await response.json();

      if (response.ok && data.success) {

        toast.success(
          "Product added successfully"
        );

        setName("");

        setPrice("");

        setDiscountPercent("");

        setCategory("");

        setDescription("");

        setImage("");
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

        toast.error(
          data.message || "Failed to add product"
        );

      }

    } catch (error) {

      console.error(error);

      toast.error(
        "Failed to add product"
      );

    } finally {
      setIsAddingProduct(false);
    }

  }

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
        : previous.filter((_, currentIndex) =>
            currentIndex !== index
          )
    );
  }

  async function addVariantImages(index, event) {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) {
      return;
    }

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

    if (target < 0 || target >= images.length) {
      return;
    }

    [images[imageIndex], images[target]] = [images[target], images[imageIndex]];
    updateSize(variantIndex, "images", images);
  }

  return (

    <div className="admin-page">

      <h1>
        Add Product
      </h1>

      {/* CREATE CATEGORY */}

      <div className="create-category-box">

        <h2>
          Create Category
        </h2>

        <input

          type="text"

          placeholder="Category Name"

          value={newCategoryName}

          onChange={(e)=>

            setNewCategoryName(
              e.target.value
            )

          }

        />

        <input

          type="file"

          accept="image/*"

          onChange={
            handleCategoryImage
          }

        />

        <button

          type="button"

          className="add-category-btn"

          onClick={
            handleAddCategory
          }
          disabled={isAddingCategory}

        >

          {isAddingCategory ? "Saving..." : "Add Category"}

        </button>

      </div>

      {/* PRODUCT FORM */}

      <form

        className="add-product-form"

        onSubmit={handleAddProduct}

      >

        <input

          type="text"

          placeholder="Product Name"

          value={name}

          onChange={(e)=>

            setName(
              e.target.value
            )

          }

          required

        />

        <section className="admin-form-section admin-pricing-section">
          <h2>Pricing</h2>

          <div className="admin-form-grid">
            <label className="admin-form-field">
              Base Price
              <input

                type="number"

                placeholder="Base Price"

                value={price}

                onChange={(e)=>

                  setPrice(
                    e.target.value
                  )

                }

                required

              />
              <span>
                Used when no variant price is provided.
              </span>
            </label>

            <label className="admin-form-field">
              Discount
              <input

                type="number"

                placeholder="Discount % (0-90)"

                value={discountPercent}

                onChange={(e)=>

                  setDiscountPercent(
                    e.target.value
                  )

                }

                min="0"
                max="90"

              />
            </label>
          </div>

          <label className="admin-form-field admin-stock-field">
            Stock Status
            <select
              value={stockStatus}
              onChange={(event) =>
                setStockStatus(event.target.value)
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
        </section>

        <div className="variant-builder">

          <div className="variant-builder-header">
            <h2>
              Product Variants
            </h2>

            <button
              type="button"
              onClick={addSizeRow}
            >
              Add Variant
            </button>
          </div>

          <p className="variant-helper-text">
            Variant Price overrides base price for this size.
          </p>

          {variants.map((variant, index) => (

            <div
              key={index}
              className="variant-row"
            >
              <input
                type="text"
                placeholder="Size label e.g. 12 inches"
                value={variant.size}
                onChange={(e) =>
                  updateSize(
                    index,
                    "size",
                    e.target.value
                  )
                }
              />

              <input
                type="number"
                placeholder="Variant Price"
                value={variant.price}
                onChange={(e) =>
                  updateSize(
                    index,
                    "price",
                    e.target.value
                  )
                }
              />

              <input
                type="number"
                placeholder="Stock"
                value={variant.stock}
                onChange={(e) =>
                  updateSize(
                    index,
                    "stock",
                    e.target.value
                  )
                }
              />

              <button
                type="button"
                className="variant-remove-btn"
                onClick={() =>
                  removeSizeRow(index)
                }
              >
                Remove
              </button>

              <div className="variant-image-manager">
                <div className="variant-image-manager-header">
                  <strong>
                    Upload Images
                  </strong>
                  <span>
                    {(variant.images || []).length}/8
                  </span>
                </div>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) =>
                    addVariantImages(index, event)
                  }
                  disabled={(variant.images || []).length >= 8}
                />

                {(variant.images || []).length > 0 && (
                  <div className="variant-image-thumbs">
                    {(variant.images || []).map((preview, imageIndex) => (
                      <div
                        key={`${preview}-${imageIndex}`}
                        className="variant-image-thumb"
                      >
                        <img
                          src={preview}
                          alt={`Variant preview ${imageIndex + 1}`}
                          loading="lazy"
                        />
                        <div className="variant-image-actions">
                          <button
                            type="button"
                            onClick={() =>
                              moveVariantImage(index, imageIndex, -1)
                            }
                            disabled={imageIndex === 0}
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              moveVariantImage(index, imageIndex, 1)
                            }
                            disabled={imageIndex === (variant.images || []).length - 1}
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              removeVariantImage(index, imageIndex)
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

        </div>

        {/* CATEGORY */}

        <select

          value={category}

          onChange={(e)=>

            setCategory(
              e.target.value
            )

          }

          required

        >

          <option value="">
            Select Category
          </option>

          {categories.map(cat => (

            <option

              key={cat.id}

              value={cat.name}

            >

              {cat.name}

            </option>

          ))}

        </select>

        {/* DESCRIPTION */}

        <section className="admin-form-section admin-description-section">
          <h2>Description</h2>

          <label className="admin-form-field">
            Description
            <textarea

              placeholder="Description"

              value={description}

              onChange={(e)=>

                setDescription(
                  e.target.value
                )

              }

            />
          </label>
        </section>

        <section className="admin-form-section admin-image-manager">
          <div className="admin-image-manager-header">
            <h2>Product Images</h2>
            <span>{productImages.length}/8</span>
          </div>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleImage}
            required={productImages.length === 0}
          />

          <div className="admin-image-thumbs">
            {productImages.map((preview, index) => (
              <div
                key={`${preview.preview}-${index}`}
                className="admin-image-thumb"
              >
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
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => moveProductImage(index, 1)}
                    disabled={index === productImages.length - 1}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={() => removeProductImage(index)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <button
          type="submit"
          disabled={isAddingProduct}
        >

          {isAddingProduct ? "Adding Product..." : "Add Product"}

        </button>

      </form>

    </div>

  );

}

export default AdminAddProduct;

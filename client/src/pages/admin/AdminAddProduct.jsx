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

  const [variants,
    setVariants] =
    useState([
      {
        size: "",
        price: "",
        stock: ""
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

  function handleImage(e) {

    const file =
      e.target.files[0];

    if (!file) return;

    const reader =
      new FileReader();

    reader.onloadend = () => {

      setImage(
        reader.result
      );

    };

    reader.readAsDataURL(
      file
    );

  }

  /* CATEGORY IMAGE */

  function handleCategoryImage(e) {

    const file =
      e.target.files[0];

    if (!file) return;

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
      const response = await fetch(
        getApiUrl("/api/categories"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: newCategoryName,
            image: newCategoryImage
          })
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

      const response = await fetch(
        getApiUrl("/api/products"),
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({

            name,

            price,

            discountPercent,

            category,

            description,

            image,

            stock: 100,

            stockStatus,

            variants:
              variants
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
                      : Number(variant.stock)
                }))

          })

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

        setVariants([
          {
            size: "",
            price: "",
            stock: ""
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
        stock: ""
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

        {/* PRODUCT IMAGE */}

        <input

          type="file"

          accept="image/*"

          onChange={handleImage}

          required

        />

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

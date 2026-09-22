import "./Products.css";

import Footer from "./Footer";

import { motion }
from "framer-motion";

import {
  useNavigate
}
from "react-router-dom";

import {
  useContext,
  useEffect,
  useState
}
from "react";

import toast from "react-hot-toast";

import { CartContext }
from "../context/CartContext";

import {
  WishlistContext
} from "../context/WishlistContext";

import {
  getApiUrl
}
from "../utils/api";

import {
  PRODUCT_PLACEHOLDER,
  getPrimaryImage,
  handleImageFallback
}
from "../utils/imageFallback";

import {
  getProductVariants,
  getStockLabel,
  isOutOfStock
} from "../utils/productDisplay";

function RatingStars({
  rating,
  reviewCount
}) {
  const safeRating =
    Number(rating || 0);

  const count =
    Number(reviewCount || 0);

  const roundedRating =
    Math.round(safeRating);

  return (
    <div className="product-rating">
      <span
        className="rating-stars"
        aria-label={`${safeRating.toFixed(1)} out of 5 stars`}
      >
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={
              star <= roundedRating
                ? "rating-star filled"
                : "rating-star"
            }
          >
            {star <= roundedRating ? "★" : "☆"}
          </span>
        ))}
      </span>

      <span className="rating-copy">
        {count > 0
          ? `${safeRating.toFixed(1)} (${count} ${count === 1 ? "review" : "reviews"})`
          : "No reviews yet"}
      </span>
    </div>
  );
}

function Products({

  selectedCategory

}) {

  const navigate =
    useNavigate();

  const searchParams =
    new URLSearchParams(window.location.search);

  const isShopPage =
    window.location.pathname === "/shop";

  const {
    addToCart,
    cartItems,
    decreaseQty,
    removeFromCart
  } =
    useContext(CartContext);

  const {
    isWishlisted,
    toggleWishlist
  } =
    useContext(WishlistContext);

  /* PRODUCTS */

  const [products,
    setProducts] =
    useState([]);

  const [cartToast,
    setCartToast] =
    useState(null);

  const [selectedVariants,
    setSelectedVariants] =
    useState({});

  const [sizePickerProduct,
    setSizePickerProduct] =
    useState(null);

  const [filtersOpen,
    setFiltersOpen] =
    useState(false);

  const [filters,
    setFilters] =
    useState({
      category: selectedCategory || searchParams.get("category") || "",
      min: searchParams.get("min") || "",
      max: searchParams.get("max") || "",
      inStock: searchParams.get("stock") === "in_stock",
      onSale: searchParams.get("sale") === "1",
      rating: searchParams.get("rating") || "",
      sort: searchParams.get("sort") || "newest"
    });

  /* LOAD */

 useEffect(() => {

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

      if (data.success) {

        setProducts(
          data.products
        );

      }

    } catch (error) {

      console.error(
        "Failed to load products:",
        error
      );

    }

  }

  fetchProducts();

  function refreshProducts() {

    if (!document.hidden) {

      fetchProducts();

    }

  }

  window.addEventListener(
    "focus",
    refreshProducts
  );

  document.addEventListener(
    "visibilitychange",
    refreshProducts
  );

  return () => {

    window.removeEventListener(
      "focus",
      refreshProducts
    );

    document.removeEventListener(
      "visibilitychange",
      refreshProducts
    );

  };

}, []);

  /* FILTER */

  useEffect(() => {
    if (!isShopPage) {
      return;
    }

    const params =
      new URLSearchParams();

    if (filters.category) params.set("category", filters.category);
    if (filters.min) params.set("min", filters.min);
    if (filters.max) params.set("max", filters.max);
    if (filters.inStock) params.set("stock", "in_stock");
    if (filters.onSale) params.set("sale", "1");
    if (filters.rating) params.set("rating", filters.rating);
    if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);

    const query =
      params.toString();

    window.history.replaceState(
      {},
      "",
      query ? `/shop?${query}` : "/shop"
    );
  }, [filters, isShopPage]);

  const categories =
    [...new Set(
      products
        .map(product => product.category)
        .filter(Boolean)
    )];

  const filteredProducts =
    products
      .filter(item =>
        !filters.category ||
        item.category === filters.category
      )
      .filter(item =>
        !filters.min ||
        Number(item.finalPrice || item.discountedPrice || item.price || 0) >=
          Number(filters.min)
      )
      .filter(item =>
        !filters.max ||
        Number(item.finalPrice || item.discountedPrice || item.price || 0) <=
          Number(filters.max)
      )
      .filter(item =>
        !filters.inStock ||
        !isOutOfStock(item)
      )
      .filter(item =>
        !filters.onSale ||
        Number(item.discountPercent || 0) > 0
      )
      .filter(item =>
        !filters.rating ||
        Number(item.averageRating || 0) >= Number(filters.rating)
      )
      .sort((a, b) => {
        const aPrice = Number(a.finalPrice || a.discountedPrice || a.price || 0);
        const bPrice = Number(b.finalPrice || b.discountedPrice || b.price || 0);

        if (filters.sort === "price_asc") return aPrice - bPrice;
        if (filters.sort === "price_desc") return bPrice - aPrice;
        if (filters.sort === "rating") return Number(b.averageRating || 0) - Number(a.averageRating || 0);
        if (filters.sort === "reviewed") return Number(b.reviewCount || 0) - Number(a.reviewCount || 0);
        if (filters.sort === "discount") return Number(b.discountPercent || 0) - Number(a.discountPercent || 0);
        return Number(b.id || 0) - Number(a.id || 0);
      });

  function openDetails(e, id) {

    e.stopPropagation();

    navigate(
      `/product/${id}`
    );

  }

  function buyNow(e, product) {

    e.stopPropagation();

    const variants =
      getProductVariants(product);

    if (isOutOfStock(product)) {
      return;
    }

    if (variants.length > 0) {
      setSizePickerProduct(product);
      return;
    }

    const selectedVariant =
      null;

    const cartProduct = {
      ...product,
      price:
        selectedVariant?.finalPrice ||
        selectedVariant?.discountedPrice ||
        selectedVariant?.price ||
        product.finalPrice ||
        product.discountedPrice ||
        product.price,
      variantId:
        selectedVariant?.id,
      variantLabel:
        selectedVariant?.size ||
        selectedVariant?.label,
      variantDimensions:
        selectedVariant?.dimensions
    };

    addToCart(cartProduct);

    setCartToast({

      product: cartProduct,

      quantity:
        getProductQuantity(cartProduct) + 1

    });

  }

  function getProductKey(product) {
    return `${product.id}-${product.variantId || "default"}`;
  }

  function getProductQuantity(product) {
    const productKey =
      getProductKey(product);

    const cartItem =
      cartItems.find(
        item =>
          String(item.cartKey || getProductKey(item)) ===
          String(productKey)
      );

    return cartItem?.quantity || 0;

  }

  function addMoreFromToast() {

    if (!cartToast?.product)
      return;

    addToCart(cartToast.product);

    setCartToast(prev => ({

      ...prev,

      quantity:
        (prev.quantity || 0) + 1

    }));

  }

  function removeOneFromToast() {

    if (!cartToast?.product)
      return;

    if (cartToast.quantity <= 1) {

      removeFromCart(
        getProductKey(cartToast.product)
      );

      setCartToast(null);

      return;

    }

    decreaseQty(
      getProductKey(cartToast.product)
    );

    setCartToast(prev => ({

      ...prev,

      quantity:
        Math.max(
          (prev.quantity || 1) - 1,
          1
        )

    }));

  }

  function confirmSizeSelection() {
    if (!sizePickerProduct) {
      return;
    }

    const variants =
      getProductVariants(sizePickerProduct);

    const selectedVariant =
      variants[selectedVariants[sizePickerProduct.id]];

    if (!selectedVariant) {
      toast.error("Please select a size before adding this product.");
      return;
    }

    const cartProduct = {
      ...sizePickerProduct,
      price:
        selectedVariant?.finalPrice ||
        selectedVariant?.discountedPrice ||
        selectedVariant?.price ||
        sizePickerProduct.finalPrice ||
        sizePickerProduct.discountedPrice ||
        sizePickerProduct.price,
      variantId:
        selectedVariant?.id,
      variantLabel:
        selectedVariant?.size ||
        selectedVariant?.label,
      variantDimensions:
        selectedVariant?.dimensions
    };

    addToCart(cartProduct);

    setCartToast({
      product: cartProduct,
      quantity:
        getProductQuantity(cartProduct) + 1
    });

    setSizePickerProduct(null);
  }

  return (

    <>

      <section className="products">

        <div className="container">

          {/* TAG */}

          <p className="section-tag">

            OUR PRODUCTS

          </p>

          {/* TITLE */}

          <h2 className="section-title">

            {selectedCategory

              ? `${selectedCategory} Collection`

              : "Featured Products"}

          </h2>

          {isShopPage && (
            <div className="shop-filter-shell">
              {filtersOpen && (
                <button
                  type="button"
                  className="shop-filter-backdrop"
                  aria-label="Close filters"
                  onClick={() => setFiltersOpen(false)}
                />
              )}
              <button
                type="button"
                className="shop-filter-toggle"
                aria-expanded={filtersOpen}
                onClick={() =>
                  setFiltersOpen(previous => !previous)
                }
              >
                Filters
              </button>

              <div
                className={
                  filtersOpen
                    ? "shop-filters open"
                    : "shop-filters"
                }
              >
                <div className="shop-filter-sheet-header">
                  <h3>Filters</h3>
                  <button
                    type="button"
                    aria-label="Close filters"
                    onClick={() => setFiltersOpen(false)}
                  >
                    ×
                  </button>
                </div>
                <label className="filter-control">
                  <span>Category</span>
                  <select
                    value={filters.category}
                    onChange={(event) =>
                      setFilters(previous => ({
                        ...previous,
                        category: event.target.value
                      }))
                    }
                  >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                ))}
                  </select>
                </label>

                <label className="filter-control filter-price-control">
                  <span>Price</span>
                  <span className="filter-price-inputs">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.min}
                    onChange={(event) =>
                      setFilters(previous => ({
                        ...previous,
                        min: event.target.value
                      }))
                    }
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.max}
                    onChange={(event) =>
                      setFilters(previous => ({
                        ...previous,
                        max: event.target.value
                      }))
                    }
                  />
                  </span>
                </label>

              <label className="filter-check">
                <input
                  type="checkbox"
                  checked={filters.inStock}
                  onChange={(event) =>
                    setFilters(previous => ({
                      ...previous,
                      inStock: event.target.checked
                    }))
                  }
                />
                In stock only
              </label>

              <label className="filter-check">
                <input
                  type="checkbox"
                  checked={filters.onSale}
                  onChange={(event) =>
                    setFilters(previous => ({
                      ...previous,
                      onSale: event.target.checked
                    }))
                  }
                />
                On sale
              </label>

                <label className="filter-control">
                  <span>Minimum reviews</span>
                  <select
                    value={filters.rating}
                    onChange={(event) =>
                      setFilters(previous => ({
                        ...previous,
                        rating: event.target.value
                      }))
                    }
                  >
                <option value="">Any rating</option>
                <option value="4">4★ & above</option>
                  </select>
                </label>

                <label className="filter-control">
                  <span>Sort by</span>
                  <select
                    value={filters.sort}
                    onChange={(event) =>
                      setFilters(previous => ({
                        ...previous,
                        sort: event.target.value
                      }))
                    }
                  >
                <option value="newest">Newest</option>
                <option value="price_asc">Price low to high</option>
                <option value="price_desc">Price high to low</option>
                <option value="rating">Highest rated</option>
                <option value="reviewed">Most reviewed</option>
                <option value="discount">Discount %</option>
                  </select>
                </label>
                <div className="shop-filter-actions">
                  <button
                    type="button"
                    className="filter-clear-btn"
                    onClick={() => setFilters({
                      category: "",
                      min: "",
                      max: "",
                      inStock: false,
                      onSale: false,
                      rating: "",
                      sort: "newest"
                    })}
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    className="filter-apply-btn"
                    onClick={() => setFiltersOpen(false)}
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* EMPTY */}

          {filteredProducts.length === 0 ? (

            <div className="empty-products">

              <h3>

                No Products Available

              </h3>

              <p>

                Products added by admin
                will appear here.

              </p>

            </div>

          ) : (

            <div className="product-grid">

              {filteredProducts.map(

                (item, index) => (

                  <motion.div

                    className={
                      isOutOfStock(item)
                        ? "product-card out-of-stock"
                        : "product-card"
                    }

                    key={item.id}

                    onClick={() =>

                      navigate(
                        `/product/${item.id}`
                      )

                    }

                    initial={{
                      opacity: 0,
                      y: 60
                    }}

                    whileInView={{
                      opacity: 1,
                      y: 0
                    }}

                    transition={{
                      duration: 0.5,
                      delay:
                        index * 0.1
                    }}

                  >

                    {/* IMAGE */}

                    <div className="image-container product-image-container">
                      <img

                      src={getPrimaryImage(item) || PRODUCT_PLACEHOLDER}

                      alt={item.name}
                      loading="lazy"

                      onError={handleImageFallback}

                      />

                      {getStockLabel(item) && (
                        <span
                          className={
                            isOutOfStock(item)
                              ? "stock-badge out"
                              : "stock-badge low"
                          }
                        >
                          {getStockLabel(item)}
                        </span>
                      )}

                      <button
                        type="button"
                        className={
                          isWishlisted(item.id)
                            ? "wishlist-heart saved"
                            : "wishlist-heart"
                        }
                        aria-label="Toggle wishlist"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleWishlist(item);
                        }}
                      >
                        {isWishlisted(item.id) ? "♥" : "♡"}
                      </button>
                    </div>

                    {/* CATEGORY */}

                    <span className="product-category">

                      {item.category}

                    </span>

                    {/* NAME */}

                    <h3>
                      {item.name}
                    </h3>

                    {/* PRICE */}

                    <p className="price">

                      {item.discountPercent > 0 ? (
                        <>
                          <span className="old-price">
                            Rs. {item.price}
                          </span>
                          Rs. {item.discountedPrice}
                          <span className="discount-badge">
                            {item.discountPercent}% OFF
                          </span>
                        </>
                      ) : (
                        <>Rs. {item.price}</>
                      )}

                    </p>

                    <RatingStars
                      rating={item.averageRating}
                      reviewCount={item.reviewCount}
                    />

                    {/* BUTTONS */}

                    <div className="product-buttons">

                      <button

                        className="details-btn"

                        onClick={(e) =>
                          openDetails(
                            e,
                            item.id
                          )
                        }

                      >

                        View Details

                      </button>

                      <button

                        className="buy-now-btn"
                        disabled={
                          isOutOfStock(item)
                        }

                        onClick={(e) =>
                          buyNow(
                            e,
                            item
                          )
                        }

                      >

                        {isOutOfStock(item)
                          ? "Out of Stock"
                          : "Buy Now"}

                      </button>

                    </div>

                  </motion.div>

                )

              )}

            </div>

          )}

        </div>

        {cartToast && (

          <div className="cart-toast">

            <button

              className="cart-toast-close"

              type="button"

              aria-label="Close cart popup"

              onClick={() =>
                setCartToast(null)
              }

            >

              x

            </button>

            <div className="cart-toast-text">

              <strong>
                Added to cart
              </strong>

              <span>
                {cartToast.product.name}
              </span>

              <div className="cart-toast-qty">

                <button

                  type="button"

                  aria-label="Remove one item"

                  onClick={removeOneFromToast}

                >

                  -

                </button>

                <strong>

                  Qty:
                  {" "}
                  {cartToast.quantity}

                </strong>

                <button

                  type="button"

                  aria-label="Add one more item"

                  onClick={addMoreFromToast}

                >

                  +

                </button>

              </div>

            </div>

            <button

              className="cart-toast-btn"

              onClick={() =>
                navigate("/cart")
              }

            >

              Go to Cart

            </button>

          </div>

        )}

        {sizePickerProduct && (
          <div
            className="size-picker-overlay"
            onClick={() =>
              setSizePickerProduct(null)
            }
          >
            <div
              className="size-picker-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <button
                type="button"
                className="size-picker-close"
                aria-label="Close size picker"
                onClick={() =>
                  setSizePickerProduct(null)
                }
              >
                x
              </button>

              <h3>Select size</h3>
              <p>{sizePickerProduct.name}</p>

              <div className="size-picker-options">
                {getProductVariants(sizePickerProduct).map((variant, variantIndex) => (
                  <button
                    key={variant.id || variantIndex}
                    type="button"
                    className={
                      selectedVariants[sizePickerProduct.id] === variantIndex
                        ? "size-picker-option active"
                        : "size-picker-option"
                    }
                    onClick={() =>
                      setSelectedVariants(previous => ({
                        ...previous,
                        [sizePickerProduct.id]: variantIndex
                      }))
                    }
                  >
                    <strong>
                      {variant.size || variant.label}
                    </strong>
                    {variant.dimensions && (
                      <span>
                        {variant.dimensions}
                      </span>
                    )}
                    {variant.price && (
                      <small>
                        Rs. {variant.discountedPrice || variant.finalPrice || variant.price}
                      </small>
                    )}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="size-picker-confirm"
                onClick={confirmSizeSelection}
              >
                Add To Cart
              </button>
            </div>
          </div>
        )}

      </section>

      <Footer />

    </>

  );

}

export default Products;

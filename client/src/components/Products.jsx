import "./Products.css";

import Footer from "./Footer";
import ProductCardSkeleton from "./ProductCardSkeleton";

import { motion }
from "framer-motion";

import {
  useNavigate,
  useLocation,
  Link
}
from "react-router-dom";

import {
  useContext,
  useEffect,
  useState,
  useCallback
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
  getProductVariants
} from "../utils/productDisplay";
import { getCategorySeo } from "../utils/seoConfig";
import { formatProductTitle } from "../utils/seoMetadata";

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

function getPaginationPages(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) return [1, 2, 3, 4, "ellipsis", totalPages];
  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
}

function getSortLabel(sortValue) {
  switch (sortValue) {
    case "price_asc": return "Price: Low to High";
    case "price_desc": return "Price: High to Low";
    case "rating": return "Highest Rated";
    case "reviewed": return "Most Reviewed";
    case "discount": return "Discount %";
    default: return "Newest";
  }
}

function Products({

  selectedCategory

}) {

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const searchParams =
    new URLSearchParams(location.search);

  const isShopPage =
    location.pathname === "/shop";

  const {
    addToCart,
    cartItems,
    increaseQty,
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

  const [categories,
    setCategories] =
    useState([]);

  const [loading,
    setLoading] =
    useState(true);

  const [loadError,
    setLoadError] =
    useState("");

  const [pagination,
    setPagination] =
    useState(null);

  const [page,
    setPage] =
    useState(() => Math.max(1, Number(searchParams.get("page")) || 1));

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
      search: searchParams.get("search") || "",
      category: selectedCategory || searchParams.get("category") || "",
      min: searchParams.get("min") || "",
      max: searchParams.get("max") || "",
      onSale: searchParams.get("sale") === "1",
      rating: searchParams.get("rating") || "",
      sort: searchParams.get("sort") || "newest"
    });

  const currentCategorySeo =
    filters.category ? getCategorySeo(filters.category) : null;

  const [searchInput, setSearchInput] = useState(() => searchParams.get("search") || "");

  /* LOAD */

  const fetchProducts = useCallback(async (signal) => {
    const params = new URLSearchParams();
    params.set("page", String(isShopPage ? page : 1));
    params.set("limit", isShopPage ? "10" : "12");

    if (isShopPage) {
      if (filters.search) params.set("search", filters.search);
      if (filters.category) params.set("category", filters.category);
      if (filters.min) params.set("min", filters.min);
      if (filters.max) params.set("max", filters.max);
      if (filters.onSale) params.set("sale", "1");
      if (filters.rating) params.set("rating", filters.rating);
      if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
    }

    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch(getApiUrl(`/api/products?${params}`), {
        cache: "no-store",
        signal
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 404) {
          setProducts([]);
          setPagination(null);
          return;
        }
        throw new Error(data.message || "Unable to load products.");
      }

      setProducts(data.products || []);
      setPagination(data.pagination || null);
      if (isShopPage && data.pagination?.page && data.pagination.page !== page) {
        setPage(data.pagination.page);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setProducts([]);
        setLoadError(error.message || "Unable to load products.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [filters, isShopPage, page]);

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal);
    return () => controller.abort();
  }, [fetchProducts]);

  useEffect(() => {
    if (!isShopPage) return;
    const controller = new AbortController();
    async function loadCategories() {
      try {
        const response = await fetch(getApiUrl("/api/categories"), { signal: controller.signal });
        const data = await response.json();
        if (response.ok && data.success) setCategories(data.categories || []);
      } catch (error) {
        if (error.name !== "AbortError") console.error("Failed to load categories:", error);
      }
    }
    loadCategories();
    return () => controller.abort();
  }, [isShopPage]);

  useEffect(() => {
    if (!isShopPage) return;

    const params = new URLSearchParams(location.search);
    setPage(Math.max(1, Number(params.get("page")) || 1));
    const nextSearch = params.get("search") || "";
    setSearchInput(nextSearch);
    setFilters({
      search: nextSearch,
      category: selectedCategory || params.get("category") || "",
      min: params.get("min") || "",
      max: params.get("max") || "",
      onSale: params.get("sale") === "1",
      rating: params.get("rating") || "",
      sort: params.get("sort") || "newest"
    });
  }, [isShopPage, location.search, selectedCategory]);

  /* FILTER */

  useEffect(() => {
    if (!isShopPage) {
      return;
    }

    const params =
      new URLSearchParams();

    if (filters.search) params.set("search", filters.search);
    if (filters.category) params.set("category", filters.category);
    if (filters.min) params.set("min", filters.min);
    if (filters.max) params.set("max", filters.max);
    if (filters.onSale) params.set("sale", "1");
    if (filters.rating) params.set("rating", filters.rating);
    if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
    if (page > 1) params.set("page", String(page));

    const query =
      params.toString();

    window.history.replaceState(
      {},
      "",
      query ? `/shop?${query}` : "/shop"
    );
  }, [filters, isShopPage, page]);

  const filteredProducts =
    products;

  function updateFilters(updater) {
    setPage(1);
    setFilters(updater);
  }

  /* DEBOUNCE SEARCH INPUT (PREVENTS SPAMMING API ON KEYSTROKES) */
  useEffect(() => {
    if (!isShopPage) return;
    const trimmedInput = searchInput.trim();
    const currentSearch = (filters.search || "").trim();
    if (trimmedInput === currentSearch) return;

    const timer = setTimeout(() => {
      updateFilters(previous => ({ ...previous, search: trimmedInput }));
    }, 280);

    return () => clearTimeout(timer);
  }, [searchInput, isShopPage, filters.search]);

  const handleClearSearch = useCallback(() => {
    setSearchInput("");
    updateFilters(previous => ({ ...previous, search: "" }));
  }, []);

  const handleSearchSubmit = (event) => {
    if (event) event.preventDefault();
    const trimmed = searchInput.trim();
    updateFilters(previous => ({ ...previous, search: trimmed }));
  };

  const hasActiveFilters = Boolean(
    (filters.search && filters.search.trim()) ||
    filters.category ||
    filters.min ||
    filters.max ||
    filters.onSale ||
    filters.rating ||
    (filters.sort && filters.sort !== "newest")
  );

  const activeFiltersCount = (
    ((filters.search && filters.search.trim()) ? 1 : 0) +
    (filters.category ? 1 : 0) +
    (filters.min || filters.max ? 1 : 0) +
    (filters.onSale ? 1 : 0) +
    (filters.rating ? 1 : 0) +
    (filters.sort && filters.sort !== "newest" ? 1 : 0)
  );

  const clearAllFilters = useCallback(() => {
    setSearchInput("");
    updateFilters({
      search: "",
      category: "",
      min: "",
      max: "",
      onSale: false,
      rating: "",
      sort: "newest"
    });
  }, []);

  useEffect(() => {
    if (!isShopPage) return;
    if (filtersOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [filtersOpen, isShopPage]);

  function changePage(nextPage) {
    if (!pagination || nextPage < 1 || nextPage > pagination.totalPages || nextPage === page) {
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    setPage(nextPage);
  }

  function openDetails(e, id) {

    e.stopPropagation();

    navigate(
      `/product/${id}`
    );

  }

  function buyNow(e, product) {
    e.stopPropagation();

    const variants = getProductVariants(product);

    if (variants.length > 0) {
      setSelectedVariants(previous => {
        const next = { ...previous };
        delete next[product.id];
        return next;
      });
      setSizePickerProduct(product);
      return;
    }

    const selectedVariant = null;

    const cartProduct = {
      ...product,
      price:
        selectedVariant?.finalPrice ||
        selectedVariant?.discountedPrice ||
        selectedVariant?.price ||
        product.finalPrice ||
        product.discountedPrice ||
        product.price,
      variantId: selectedVariant?.id,
      variantLabel: selectedVariant?.size || selectedVariant?.label,
      variantDimensions: selectedVariant?.dimensions,
    };

    if (addToCart(cartProduct) === false) return;

    setCartToast({
      product: cartProduct,
      quantity: getProductQuantity(cartProduct) + 1
    });
  }

  function getProductKey(product) {
    return `${product.id}-${product.variantId || "default"}`;
  }

  function getProductQuantity(product) {
    const productKey = getProductKey(product);

    const cartItem = cartItems.find(
      item => String(item.cartKey || getProductKey(item)) === String(productKey)
    );

    return cartItem?.quantity || 0;
  }

  function handleToastDecrease(itemKey, currentQty) {
    if (!itemKey) return;
    if (currentQty <= 1) return;
    decreaseQty(itemKey);
    setCartToast(prev => (prev ? { ...prev, quantity: Math.max(1, currentQty - 1) } : null));
  }

  function handleToastIncrease(itemKey, currentQty) {
    if (!itemKey) return;
    if (increaseQty(itemKey) === false) return;
    setCartToast(prev => (prev ? { ...prev, quantity: currentQty + 1 } : null));
  }

  function confirmSizeSelection() {
    if (!sizePickerProduct) {
      return;
    }

    const variants = getProductVariants(sizePickerProduct);
    const selectedIndex = selectedVariants[sizePickerProduct.id];
    const selectedVariant =
      selectedIndex !== undefined && selectedIndex !== null
        ? variants[selectedIndex]
        : null;

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
      variantId: selectedVariant?.id,
      variantLabel: selectedVariant?.size || selectedVariant?.label,
      variantDimensions: selectedVariant?.dimensions,
    };

    if (addToCart(cartProduct) === false) return;

    setCartToast({
      product: cartProduct,
      quantity: getProductQuantity(cartProduct) + 1
    });

    setSizePickerProduct(null);
  }

  return (

    <>

      <section className={isShopPage ? "products shop-page-products" : "products"}>

        <div className="container">

          {isShopPage ? (
            <header className="shop-header">
              <span className="shop-header-tag">HAROON STORES</span>
              <h1 className="shop-header-title">
                {currentCategorySeo
                  ? currentCategorySeo.heading
                  : (filters.category ? `${filters.category} Collection` : "Kashmiri Wooden Handicrafts & Décor")}
              </h1>
              <p className="shop-header-intro">
                {currentCategorySeo
                  ? currentCategorySeo.intro
                  : "Shop authentic Kashmiri wooden handicrafts online at Haroon Stores. Explore hand-carved walnut wood furniture, wall panels, bowls, and traditional home décor."}
              </p>
            </header>
          ) : (
            <div className="featured-section-header">
              {/* TAG */}
              <p className="section-tag">
                OUR PRODUCTS
              </p>

              {/* TITLE */}
              <h2 className="section-title">
                {filters.category
                  ? `${filters.category} Collection`
                  : "Featured Products"}
              </h2>

              <button
                type="button"
                className="products-view-all"
                onClick={() => navigate("/shop")}
              >
                View All Products →
              </button>
            </div>
          )}

          {isShopPage && (
            <div className="shop-toolbar-wrapper">
              {/* Mobile Toolbar (visible on screens <= 860px) */}
              <div className="shop-mobile-toolbar">
                <form className="shop-mobile-search" role="search" onSubmit={handleSearchSubmit}>
                  <span className="shop-search-svg" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </span>
                  <input
                    type="search"
                    placeholder="Search crafts, boxes, trays..."
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    aria-label="Search products"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      className="shop-search-clear-btn"
                      aria-label="Clear search"
                      onClick={handleClearSearch}
                    >
                      ×
                    </button>
                  )}
                </form>

                <div className="shop-mobile-bar-actions">
                  <button
                    type="button"
                    className={`shop-mobile-filter-btn ${hasActiveFilters ? "has-filters" : ""}`}
                    aria-expanded={filtersOpen}
                    onClick={() => setFiltersOpen(true)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                    <span>Filters</span>
                    {activeFiltersCount > 0 && (
                      <span className="filter-badge-counter">{activeFiltersCount}</span>
                    )}
                  </button>

                  <div className="shop-mobile-sort-select-wrap">
                    <select
                      id="shop-mobile-sort"
                      value={filters.sort}
                      onChange={(event) => updateFilters(previous => ({ ...previous, sort: event.target.value }))}
                      aria-label="Sort products"
                    >
                      <option value="newest">Sort: Newest</option>
                      <option value="price_asc">Sort: Price: Low to High</option>
                      <option value="price_desc">Sort: Price: High to Low</option>
                      <option value="rating">Sort: Highest Rated</option>
                      <option value="reviewed">Sort: Most Reviewed</option>
                      <option value="discount">Sort: Biggest Discount</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Desktop Filter Panel (visible on screens > 860px) */}
              <div className="shop-desktop-toolbar">
                <div className="shop-desktop-top-row">
                  <form className="shop-search-field" role="search" onSubmit={handleSearchSubmit}>
                    <span className="shop-search-svg" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                    </span>
                    <input
                      type="search"
                      placeholder="Search Kashmiri crafts, boxes, tables, dry fruit trays..."
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      aria-label="Search products"
                    />
                    {searchInput && (
                      <button
                        type="button"
                        className="shop-search-clear-btn"
                        aria-label="Clear search"
                        onClick={handleClearSearch}
                      >
                        ×
                      </button>
                    )}
                  </form>

                  <div className="shop-sort-control">
                    <span className="sort-label">Sort by:</span>
                    <select
                      value={filters.sort}
                      onChange={(event) => updateFilters(previous => ({ ...previous, sort: event.target.value }))}
                      aria-label="Sort products"
                    >
                      <option value="newest">Newest Arrivals</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                      <option value="rating">Highest Rated</option>
                      <option value="reviewed">Most Reviewed</option>
                      <option value="discount">Biggest Discount</option>
                    </select>
                  </div>
                </div>

                <div className="shop-desktop-filters-row">
                  <label className="filter-item">
                    <span className="filter-label">Category</span>
                    <select
                      value={filters.category}
                      onChange={(event) => updateFilters(previous => ({ ...previous, category: event.target.value }))}
                    >
                      <option value="">All Categories</option>
                      {categories.map(category => (
                        <option key={category.id || category.name} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="filter-item filter-price-group">
                    <span className="filter-label">Price Range (Rs.)</span>
                    <div className="price-inputs-row">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.min}
                        onChange={(event) => updateFilters(previous => ({ ...previous, min: event.target.value }))}
                        aria-label="Minimum price"
                      />
                      <span className="price-dash">–</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.max}
                        onChange={(event) => updateFilters(previous => ({ ...previous, max: event.target.value }))}
                        aria-label="Maximum price"
                      />
                    </div>
                  </div>

                  <label className="filter-item">
                    <span className="filter-label">Rating</span>
                    <select
                      value={filters.rating}
                      onChange={(event) => updateFilters(previous => ({ ...previous, rating: event.target.value }))}
                    >
                      <option value="">Any Rating</option>
                      <option value="4">4★ & above</option>
                    </select>
                  </label>

                  <div className="filter-checkbox-group">
                    <label className={`filter-toggle-pill ${filters.onSale ? "active" : ""}`}>
                      <input
                        type="checkbox"
                        checked={filters.onSale}
                        onChange={(event) => updateFilters(previous => ({ ...previous, onSale: event.target.checked }))}
                      />
                      <span>On Sale</span>
                    </label>
                  </div>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="filter-reset-action-btn"
                      onClick={clearAllFilters}
                    >
                      Reset All
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile Filter Drawer / Bottom Sheet */}
              {filtersOpen && (
                <button
                  type="button"
                  className="shop-filter-backdrop"
                  aria-label="Close filters"
                  onClick={() => setFiltersOpen(false)}
                />
              )}

              <div className={`shop-filters-sheet ${filtersOpen ? "open" : ""}`} role="dialog" aria-modal="true" aria-label="Filter products">
                <div className="sheet-header">
                  <div className="sheet-title-row">
                    <h3>Filters</h3>
                    {activeFiltersCount > 0 && (
                      <span className="sheet-active-pill">{activeFiltersCount} active</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="sheet-close-btn"
                    aria-label="Close filters"
                    onClick={() => setFiltersOpen(false)}
                  >
                    ×
                  </button>
                </div>

                <div className="sheet-body">
                  <div className="sheet-group">
                    <label className="sheet-label">Category</label>
                    <select
                      className="sheet-select"
                      value={filters.category}
                      onChange={(event) => updateFilters(previous => ({ ...previous, category: event.target.value }))}
                    >
                      <option value="">All Categories</option>
                      {categories.map(category => (
                        <option key={category.id || category.name} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sheet-group">
                    <label className="sheet-label">Price Range (Rs.)</label>
                    <div className="sheet-price-row">
                      <input
                        type="number"
                        placeholder="Min Price"
                        value={filters.min}
                        onChange={(event) => updateFilters(previous => ({ ...previous, min: event.target.value }))}
                        aria-label="Min price"
                      />
                      <span className="sheet-price-sep">to</span>
                      <input
                        type="number"
                        placeholder="Max Price"
                        value={filters.max}
                        onChange={(event) => updateFilters(previous => ({ ...previous, max: event.target.value }))}
                        aria-label="Max price"
                      />
                    </div>
                  </div>

                  <div className="sheet-group">
                    <label className="sheet-label">Special Offers</label>
                    <div className="sheet-checkbox-stack">

                      <label className={`sheet-checkbox-card ${filters.onSale ? "checked" : ""}`}>
                        <input
                          type="checkbox"
                          checked={filters.onSale}
                          onChange={(event) => updateFilters(previous => ({ ...previous, onSale: event.target.checked }))}
                        />
                        <div className="checkbox-text">
                          <strong>On Sale</strong>
                          <span>Show only items with active discounts</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="sheet-group">
                    <label className="sheet-label">Customer Rating</label>
                    <select
                      className="sheet-select"
                      value={filters.rating}
                      onChange={(event) => updateFilters(previous => ({ ...previous, rating: event.target.value }))}
                    >
                      <option value="">Any Rating</option>
                      <option value="4">4★ & above</option>
                    </select>
                  </div>

                  <div className="sheet-group">
                    <label className="sheet-label">Sort By</label>
                    <select
                      className="sheet-select"
                      value={filters.sort}
                      onChange={(event) => updateFilters(previous => ({ ...previous, sort: event.target.value }))}
                    >
                      <option value="newest">Newest Arrivals</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                      <option value="rating">Highest Rated</option>
                      <option value="reviewed">Most Reviewed</option>
                      <option value="discount">Biggest Discount</option>
                    </select>
                  </div>
                </div>

                <div className="sheet-footer">
                  <button
                    type="button"
                    className="sheet-clear-btn"
                    onClick={clearAllFilters}
                    disabled={!hasActiveFilters}
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    className="sheet-apply-btn"
                    onClick={() => setFiltersOpen(false)}
                  >
                    View Products {pagination?.total !== undefined ? `(${pagination.total})` : ""}
                  </button>
                </div>
              </div>

              {/* Active Filter Chips */}
              {hasActiveFilters && (
                <div className="shop-active-chips-strip" role="region" aria-label="Active filters">
                  <span className="chips-title">Active Filters:</span>
                  <div className="chips-wrapper">
                    {filters.search && (
                      <span className="active-chip">
                        Search: "{filters.search}"
                        <button
                          type="button"
                          aria-label="Remove search filter"
                          onClick={() => updateFilters(previous => ({ ...previous, search: "" }))}
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {filters.category && (
                      <span className="active-chip">
                        Category: {filters.category}
                        <button
                          type="button"
                          aria-label="Remove category filter"
                          onClick={() => updateFilters(previous => ({ ...previous, category: "" }))}
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {(filters.min || filters.max) && (
                      <span className="active-chip">
                        Rs. {filters.min || "0"} – {filters.max ? `Rs. ${filters.max}` : "Above"}
                        <button
                          type="button"
                          aria-label="Remove price filter"
                          onClick={() => updateFilters(previous => ({ ...previous, min: "", max: "" }))}
                        >
                          ×
                        </button>
                      </span>
                    )}

                    {filters.onSale && (
                      <span className="active-chip">
                        On Sale
                        <button
                          type="button"
                          aria-label="Remove sale filter"
                          onClick={() => updateFilters(previous => ({ ...previous, onSale: false }))}
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {filters.rating && (
                      <span className="active-chip">
                        4★ & above
                        <button
                          type="button"
                          aria-label="Remove rating filter"
                          onClick={() => updateFilters(previous => ({ ...previous, rating: "" }))}
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {filters.sort && filters.sort !== "newest" && (
                      <span className="active-chip">
                        Sort: {getSortLabel(filters.sort)}
                        <button
                          type="button"
                          aria-label="Reset sort order"
                          onClick={() => updateFilters(previous => ({ ...previous, sort: "newest" }))}
                        >
                          ×
                        </button>
                      </span>
                    )}
                    <button
                      type="button"
                      className="chips-clear-all"
                      onClick={clearAllFilters}
                    >
                      Clear All ({activeFiltersCount})
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* EMPTY & LOADING STATES */}

          {loading ? (

            <div className={!isShopPage ? "featured-carousel-container" : undefined}>
              <div className="product-grid" aria-busy="true" aria-label="Loading products">
                <ProductCardSkeleton count={isShopPage ? 10 : 12} />
              </div>
            </div>

          ) : loadError ? (

            <div className="product-load-state" role="alert">
              <h3>Could not load products</h3>
              <p>{loadError}</p>
              <button type="button" onClick={() => fetchProducts()}>
                Retry
              </button>
            </div>

          ) : filteredProducts.length === 0 ? (

            <div className="empty-products" role="status">

              {Boolean(filters.search && filters.search.trim()) ? (
                <>
                  <div className="empty-search-icon-wrap" aria-hidden="true">
                    <svg
                      width="38"
                      height="38"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </div>

                  <h3>No products found</h3>

                  <p>Try another product name or check your spelling.</p>

                  <div className="empty-search-actions">
                    <button
                      type="button"
                      className="empty-clear-search-btn"
                      onClick={handleClearSearch}
                    >
                      Clear search
                    </button>
                    {isShopPage && hasActiveFilters && (filters.category || filters.min || filters.max || filters.onSale || filters.rating) && (
                      <button
                        type="button"
                        className="empty-clear-all-link"
                        onClick={clearAllFilters}
                      >
                        Reset all filters
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h3>No Products Available</h3>

                  <p>No products match the current selection. Try adjusting your filters or browse again later.</p>

                  {isShopPage && hasActiveFilters && (
                    <button
                      type="button"
                      className="empty-clear-filters-btn"
                      onClick={clearAllFilters}
                    >
                      Clear All Filters
                    </button>
                  )}
                </>
              )}

            </div>

          ) : (

            <div className={!isShopPage ? "featured-carousel-container" : undefined}>
              <div className="product-grid">

                {filteredProducts.map(

                  (item, index) => (

                    <motion.div

                      className="product-card"

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

                      viewport={{ once: true }}

                      transition={{
                        duration: 0.5,
                        delay:
                          isShopPage ? index * 0.1 : Math.min(index * 0.05, 0.25)
                      }}

                  >

                    {/* IMAGE */}

                    <div className="image-container product-image-container">
                      <img

                      src={getPrimaryImage(item) || PRODUCT_PLACEHOLDER}

                      alt={`${formatProductTitle(item.name)} - Kashmiri Walnut Wood Handicraft`}
                      loading="lazy"

                      onError={handleImageFallback}

                      />

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
                      <Link
                        to={`/product/${item.id}`}
                        className="product-title-link"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {formatProductTitle(item.name)}
                      </Link>
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
                        onClick={(e) =>
                          buyNow(
                            e,
                            item
                          )
                        }
                      >
                        Buy Now
                      </button>

                    </div>

                  </motion.div>

                )

              )}

              </div>
            </div>

          )}

          {!loading && !loadError && isShopPage && pagination?.total > 0 && (
            <nav className="product-pagination" aria-label="Product pages">
              <button
                type="button"
                className="pagination-nav-btn prev-btn"
                onClick={() => changePage(page - 1)}
                disabled={!pagination.hasPreviousPage}
                aria-label="Previous page"
              >
                Previous
              </button>

              <div className="product-pagination-pages">
                {getPaginationPages(page, pagination.totalPages).map((item, index) => (
                  item === "ellipsis" ? (
                    <span className="pagination-ellipsis" key={`ellipsis-${index}`}>…</span>
                  ) : (
                    <button
                      type="button"
                      key={item}
                      className={`pagination-number-btn ${item === page ? "is-current" : ""}`}
                      aria-current={item === page ? "page" : undefined}
                      onClick={() => changePage(item)}
                    >
                      {item}
                    </button>
                  )
                ))}
              </div>

              <button
                type="button"
                className="pagination-nav-btn next-btn"
                onClick={() => changePage(page + 1)}
                disabled={!pagination.hasNextPage}
                aria-label="Next page"
              >
                Next
              </button>

              <div className="product-pagination-status">
                Page {page} of {pagination.totalPages} ({pagination.total} {pagination.total === 1 ? "product" : "products"})
              </div>
            </nav>
          )}

        </div>

        {/* ADDED TO CART MODAL */}
        {cartToast && (() => {
          const toastItemKey = cartToast?.product ? (cartToast.product.cartKey || getProductKey(cartToast.product)) : null;
          const currentToastCartItem = cartToast?.product
            ? cartItems.find(item => String(item.cartKey || getProductKey(item)) === String(toastItemKey))
            : null;
          const currentToastQty = currentToastCartItem?.quantity ?? cartToast?.quantity ?? 1;
          const isDecreaseDisabled = currentToastQty <= 1;
          const isIncreaseDisabled = currentToastQty >= 500;

          return (
            <div
              className="cart-toast-overlay"
              onClick={() => setCartToast(null)}
            >
              <div
                className="cart-toast-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="cart-toast-close"
                  type="button"
                  aria-label="Close popup"
                  onClick={() => setCartToast(null)}
                >
                  ×
                </button>

                <div className="cart-toast-header">
                  <span className="cart-toast-badge" aria-hidden="true">✓</span>
                  <h3 className="cart-toast-heading">Added to Cart</h3>
                </div>

                <div className="cart-toast-product">
                  <div className="cart-toast-thumb-wrap">
                    <img
                      src={getPrimaryImage(cartToast.product)}
                      alt={cartToast.product.name}
                      onError={handleImageFallback}
                      className="cart-toast-thumb"
                    />
                  </div>
                  <div className="cart-toast-info">
                    <h4 className="cart-toast-pname">{cartToast.product.name}</h4>
                    {cartToast.product.variantLabel && (
                      <span className="cart-toast-variant">
                        Option: <strong>{cartToast.product.variantLabel}</strong>
                        {cartToast.product.variantDimensions && ` (${cartToast.product.variantDimensions})`}
                      </span>
                    )}
                    {cartToast.product.price && (
                      <span className="cart-toast-price">
                        Rs. {cartToast.product.price}
                      </span>
                    )}
                  </div>
                </div>

                <div className="cart-toast-qty-row">
                  <span className="cart-toast-qty-label">Quantity</span>
                  <div className="cart-qty-selector">
                    <button
                      type="button"
                      className="cart-qty-btn"
                      aria-label="Decrease quantity"
                      disabled={isDecreaseDisabled}
                      onClick={() => handleToastDecrease(toastItemKey, currentToastQty)}
                    >
                      −
                    </button>
                    <span className="cart-qty-value">{currentToastQty}</span>
                    <button
                      type="button"
                      className="cart-qty-btn"
                      aria-label="Increase quantity"
                      disabled={isIncreaseDisabled}
                      onClick={() => handleToastIncrease(toastItemKey, currentToastQty)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="cart-toast-btn"
                  onClick={() => {
                    setCartToast(null);
                    navigate("/cart");
                  }}
                >
                  Go to Cart
                </button>
              </div>
            </div>
          );
        })()}

        {/* SELECT SIZE MODAL */}
        {sizePickerProduct && (() => {
          const pickerVariants = getProductVariants(sizePickerProduct);
          const selectedIndex = selectedVariants[sizePickerProduct.id];
          const selectedVariant =
            selectedIndex !== undefined && selectedIndex !== null
              ? pickerVariants[selectedIndex]
              : null;

          return (
            <div
              className="size-picker-overlay"
              onClick={() => setSizePickerProduct(null)}
            >
              <div
                className="size-picker-modal"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="size-picker-close"
                  aria-label="Close size picker"
                  onClick={() => setSizePickerProduct(null)}
                >
                  ×
                </button>

                <div className="size-picker-header">
                  <div className="size-picker-title-row">
                    <h3 className="size-picker-title">Select Size</h3>
                    {selectedVariant && (
                      <span className="size-picker-selected-tag">
                        Selected: <strong>{selectedVariant.size || selectedVariant.label}</strong>
                      </span>
                    )}
                  </div>
                  <p className="size-picker-pname">{sizePickerProduct.name}</p>
                </div>

                <div className="size-picker-options">
                  {pickerVariants.map((variant, variantIndex) => {
                    const isSelected = selectedIndex === variantIndex;

                    return (
                      <button
                        key={variant.id || variantIndex}
                        type="button"
                        className={`size-picker-option ${isSelected ? "active" : ""}`}
                        onClick={() => {
                          setSelectedVariants(previous => {
                            const current = previous[sizePickerProduct.id];
                            if (current === variantIndex) {
                              const next = { ...previous };
                              delete next[sizePickerProduct.id];
                              return next;
                            }
                            return {
                              ...previous,
                              [sizePickerProduct.id]: variantIndex
                            };
                          });
                        }}
                      >
                        <div className="size-picker-option-left">
                          <strong className="size-picker-option-name">
                            {variant.size || variant.label}
                          </strong>
                          {variant.dimensions && (
                            <span className="size-picker-option-dim">
                              {variant.dimensions}
                            </span>
                          )}
                        </div>

                        <div className="size-picker-option-right">
                          {variant.price && (
                            <span className="size-picker-option-price">
                              Rs. {variant.discountedPrice || variant.finalPrice || variant.price}
                            </span>
                          )}
                          <span className={`size-picker-radio ${isSelected ? "checked" : ""}`} aria-hidden="true">
                            {isSelected ? "✓" : ""}
                          </span>
                        </div>
                      </button>
                    );
                  })}
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
          );
        })()}

      </section>

      <Footer />

    </>

  );

}

export default Products;

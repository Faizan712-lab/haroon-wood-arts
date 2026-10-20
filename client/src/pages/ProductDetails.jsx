import "./ProductDetails.css";

import {
  useNavigate,
  useParams,
  Link
} from "react-router-dom";

import {
  useContext,
  useEffect,
  useLayoutEffect,
  useState
} from "react";

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
  getImageList,
  handleImageFallback
}
from "../utils/imageFallback";

import {
  getProductVariants
} from "../utils/productDisplay";

import {
  applyMissingProductMetadata,
  applyProductMetadata,
  classifyProductResponse,
  formatProductTitle
} from "../utils/seoMetadata.js";

function RatingStars({
  rating,
  reviewCount
}) {
  const safeRating = Number(rating || 0);
  const count = Number(reviewCount || 0);

  if (count === 0) {
    return (
      <div className="product-rating-summary no-reviews">
        <span className="rating-empty-tag">No reviews yet</span>
      </div>
    );
  }

  return (
    <div className="product-rating-summary">
      <span
        className="rating-stars"
        aria-label={`${safeRating.toFixed(1)} out of 5 stars`}
      >
        {[1, 2, 3, 4, 5].map(star => {
          const isFilled = star <= Math.floor(safeRating);
          const isHalf = !isFilled && star === Math.ceil(safeRating) && (safeRating % 1 >= 0.25);
          return (
            <span
              key={star}
              className={
                isFilled
                  ? "rating-star filled"
                  : isHalf
                  ? "rating-star half"
                  : "rating-star empty"
              }
            >
              {isFilled ? "★" : isHalf ? "★" : "☆"}
            </span>
          );
        })}
      </span>

      <span className="rating-score">
        {safeRating.toFixed(1)}
      </span>

      <span className="rating-count">
        ({count} {count === 1 ? "review" : "reviews"})
      </span>
    </div>
  );
}

function formatReviewDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { addToCart } = useContext(CartContext);
  const { isWishlisted, toggleWishlist } = useContext(WishlistContext);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSizeIndex, setSelectedSizeIndex] = useState(null);
  const [sizeError, setSizeError] = useState(false);

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [productNotFound, setProductNotFound] = useState(false);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [galleryKey, setGalleryKey] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);

  /* GET PRODUCT */
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function fetchProduct() {
      try {
        setLoading(true);
        setLoadError("");
        setProductNotFound(false);
        setProduct(null);

        const response = await fetch(
          getApiUrl(`/api/products/${id}`),
          { cache: "no-store", signal: controller.signal }
        );

        const data = await response.json();
        const result = classifyProductResponse(response.status, data, id);

        if (!active) return;

        if (result.type === "found") {
          setProduct(result.product);
          return;
        }

        if (result.type === "missing") {
          setProductNotFound(true);
          setLoadError("This product may have been removed or is unavailable.");
          return;
        }

        setLoadError(data?.message || "Unable to load this product right now.");
      } catch (error) {
        if (error.name === "AbortError" || !active) return;
        console.error("Failed to load product:", error);
        setLoadError("Unable to load this product right now. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchProduct();

    return () => {
      active = false;
      controller.abort();
    };
  }, [id]);

  useLayoutEffect(() => {
    if (product && String(product.id) === String(id)) {
      applyProductMetadata(product, id);
    } else if (productNotFound) {
      applyMissingProductMetadata();
    }
  }, [id, product, productNotFound]);

  if (loading) {
    return (
      <div className="product-not-found">
        <div className="product-state-card">
          <span className="product-loader"></span>
          <h1>Loading product</h1>
          <p>Fetching the latest details from the store.</p>
        </div>
      </div>
    );
  }

  /* NOT FOUND OR TEMPORARY LOAD FAILURE */
  if (!product) {
    return (
      <div className="product-not-found">
        <div className="product-state-card">
          <h1>{productNotFound ? "Product not found" : "Unable to load product"}</h1>
          <p>
            {loadError || "Please try again in a moment."}
          </p>
          <button
            type="button"
            onClick={() => navigate("/shop")}
          >
            Back to Shop
          </button>
        </div>
      </div>
    );
  }

  const variants = getProductVariants(product);
  const selectedSize = variants[selectedSizeIndex];

  const productImages =
    selectedSize?.images?.length > 0
      ? getImageList(selectedSize)
      : getImageList(product);

  const activeImage =
    productImages[selectedImageIndex] ||
    productImages[0] ||
    PRODUCT_PLACEHOLDER;

  const displayPrice =
    selectedSize?.finalPrice ||
    selectedSize?.discountedPrice ||
    selectedSize?.price ||
    product.finalPrice ||
    product.discountedPrice ||
    product.price;

  const originalPrice =
    selectedSize?.price ||
    product.price;

  const hasDiscount =
    product.discountPercent > 0 &&
    displayPrice < originalPrice;

  function handleAddToCart() {
    if (variants.length > 0 && !selectedSize) {
      setSizeError(true);
      toast.error("Please select a size before adding this product.");
      return;
    }

    setSizeError(false);
    addToCart({
      ...product,
      price: displayPrice,
      productId: product.id,
      variantId: selectedSize?.id,
      variantLabel: selectedSize?.size || selectedSize?.label,
      variantDimensions: selectedSize?.dimensions
    });
  }

  function handleBuyNow() {
    if (variants.length > 0 && !selectedSize) {
      setSizeError(true);
      toast.error("Please select a size before purchasing.");
      return;
    }

    setSizeError(false);
    const added = addToCart({
      ...product,
      price: displayPrice,
      productId: product.id,
      variantId: selectedSize?.id,
      variantLabel: selectedSize?.size || selectedSize?.label,
      variantDimensions: selectedSize?.dimensions
    });
    if (added === false) return;

    navigate("/checkout");
  }

  async function submitReview(e) {
    e.preventDefault();

    try {
      setIsReviewing(true);

      const response = await fetch(
        getApiUrl(`/api/products/${id}/reviews`),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            rating,
            comment
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save review");
      }

      setProduct(data.product);
      setComment("");
      toast.success("Review saved successfully");
    } catch (error) {
      toast.error(error.message || "Please login to rate this product");
    } finally {
      setIsReviewing(false);
    }
  }

  return (
    <div className="product-details-page">
      <nav aria-label="Breadcrumb" className="product-breadcrumbs">
        <ol className="breadcrumbs-list">
          <li>
            <Link to="/">Home</Link>
          </li>
          <li aria-hidden="true" className="breadcrumb-separator">›</li>
          <li>
            <Link to="/shop">Shop</Link>
          </li>
          {product.category && (
            <>
              <li aria-hidden="true" className="breadcrumb-separator">›</li>
              <li>
                <Link to={`/shop?category=${encodeURIComponent(product.category)}`}>
                  {product.category}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true" className="breadcrumb-separator">›</li>
          <li aria-current="page" className="breadcrumb-current">
            {formatProductTitle(product.name)}
          </li>
        </ol>
      </nav>
      <div className="product-details-container">

        {/* LEFT: IMAGE GALLERY */}
        <div className="product-left">
          <div className="product-gallery">
            <div className="image-container product-details-image-container">
              <button
                key={galleryKey}
                type="button"
                className="product-main-image-button"
                onClick={() => setPreviewOpen(true)}
                aria-label="Open product image preview"
              >
                <img
                  src={activeImage}
                  alt={`${formatProductTitle(product.name)} - Handcrafted Kashmiri Walnut Wood`}
                  onError={handleImageFallback}
                />
              </button>

              <button
                type="button"
                className={`wishlist-heart ${
                  isWishlisted(product.id) ? "saved" : ""
                }`}
                aria-label={isWishlisted(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                title={isWishlisted(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                onClick={() => toggleWishlist(product)}
              >
                {isWishlisted(product.id) ? "♥" : "♡"}
              </button>
            </div>

            {productImages.length > 1 && (
              <p className="product-image-count">
                Image {Math.min(selectedImageIndex + 1, productImages.length || 1)} of {productImages.length || 1}
              </p>
            )}

            {productImages.length > 1 && (
              <div
                className="product-gallery-thumbs"
                role="tablist"
                aria-label="Product thumbnails"
              >
                {productImages.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    role="tab"
                    aria-selected={selectedImageIndex === index}
                    className={`gallery-thumb ${
                      selectedImageIndex === index ? "active" : ""
                    }`}
                    onClick={() => setSelectedImageIndex(index)}
                    aria-label={`View image ${index + 1}`}
                  >
                    <img
                      src={image}
                      alt=""
                      loading="lazy"
                      onError={handleImageFallback}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: PRODUCT INFO */}
        <div className="product-right">

          {/* 1. Category Tag & Product Name */}
          <div className="product-header-group">
            {product.category && (
              <Link
                to={`/shop?category=${encodeURIComponent(product.category)}`}
                className="product-category-tag"
              >
                {product.category}
              </Link>
            )}
            <h1 className="product-title">
              {formatProductTitle(product.name)}
            </h1>
          </div>

          {/* 2. Star Rating and Review Count */}
          <RatingStars
            rating={product.averageRating}
            reviewCount={product.reviewCount}
          />

          {/* 3 & 4. Current Selling Price, Original Price, and Discount */}
          <div className="product-price-section">
            <div className="product-price-row">
              <span className="product-selling-price">
                Rs. {displayPrice}
              </span>

              {hasDiscount && (
                <span className="product-original-price">
                  Rs. {originalPrice}
                </span>
              )}

              {hasDiscount && (
                <span className="discount-badge">
                  {product.discountPercent}% OFF
                </span>
              )}
            </div>
          </div>

          {/* 6. Product Description */}
          {product.description && product.description.trim() && (
            <div className="product-description-block">
              <h3 className="section-label">Description</h3>
              <p className="product-description-text">
                {product.description}
              </p>
            </div>
          )}

          {/* 7. Size or Product Options */}
          {variants.length > 0 && (
            <div className="product-size-panel">
              <div className="size-panel-header">
                <h3 className="section-label">Select Option</h3>
                {selectedSize && (
                  <span className="selected-size-display">
                    Selected: <strong>{selectedSize.size || selectedSize.label}</strong>
                  </span>
                )}
              </div>

              <div className={`product-size-options ${sizeError ? "has-validation-error" : ""}`}>
                {variants.map((size, index) => {
                  const isSelected = selectedSizeIndex === index;
                  return (
                    <button
                      key={size.id || index}
                      type="button"
                      className={`size-option ${isSelected ? "active" : ""}`}
                      onClick={() => {
                        if (selectedSizeIndex === index) {
                          setSelectedSizeIndex(null);
                          setSelectedImageIndex(0);
                          setGalleryKey(prev => prev + 1);
                        } else {
                          setSelectedSizeIndex(index);
                          setSizeError(false);
                          setSelectedImageIndex(0);
                          setGalleryKey(prev => prev + 1);
                        }
                      }}
                    >
                      <div className="size-option-top">
                        <strong className="size-name">
                          {size.size || size.label}
                        </strong>
                        {isSelected && (
                          <span className="size-selected-indicator">✓</span>
                        )}
                      </div>

                      {size.dimensions && (
                        <span className="size-dim">
                          {size.dimensions}
                        </span>
                      )}

                      <div className="size-option-meta">
                        {size.price && (
                          <span className="size-price-val">
                            Rs. {size.discountedPrice || size.price}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {sizeError && (
                <p className="size-error-message">
                  Please select a size option to proceed.
                </p>
              )}
            </div>
          )}

          {/* 8. Purchase Actions: Add to Cart, Buy Now, and Wishlist */}
          <div className="product-purchase-section">
            <div className="product-actions-group">
              <button
                type="button"
                className="add-cart-btn"
                onClick={handleAddToCart}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
                <span>Add To Cart</span>
              </button>

              <button
                type="button"
                className="buy-now-btn"
                onClick={handleBuyNow}
              >
                <span>Buy Now</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>

              <button
                type="button"
                className={`product-action-wishlist-btn ${
                  isWishlisted(product.id) ? "saved" : ""
                }`}
                aria-label={isWishlisted(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                title={isWishlisted(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                onClick={() => toggleWishlist(product)}
              >
                {isWishlisted(product.id) ? "♥" : "♡"}
              </button>
            </div>

            {/* Subtle Brand Identity Badges */}
            <div className="product-features-row">
              <div className="feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97928" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                <span>Authentic Kashmiri Craft</span>
              </div>
              <div className="feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97928" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                <span>Quality Handcrafted</span>
              </div>
              <div className="feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97928" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13"></rect>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
                <span>Carefully Packaged</span>
              </div>
            </div>
          </div>

          {/* 9. Customer Reviews */}
          <section className="product-review-panel">
            <div className="review-section-header">
              <h2>Customer Reviews</h2>
              {product.reviewCount > 0 && (
                <span className="review-count-badge">
                  {product.reviewCount} {product.reviewCount === 1 ? "review" : "reviews"}
                </span>
              )}
            </div>

            <form
              className="review-form"
              onSubmit={submitReview}
            >
              <h3>Write a Review</h3>

              <div className="review-rating-row">
                <span className="review-rating-prompt">Your Rating:</span>
                <div className="review-stars">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      className={
                        star <= (hoverRating || rating)
                          ? "active"
                          : ""
                      }
                      onMouseEnter={() =>
                        setHoverRating(star)
                      }
                      onMouseLeave={() =>
                        setHoverRating(0)
                      }
                      onClick={() =>
                        setRating(star)
                      }
                      aria-label={`Rate ${star} stars`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                placeholder="Share your experience with this handcrafted item..."
                value={comment}
                onChange={(e) =>
                  setComment(e.target.value)
                }
                rows={3}
              />

              <button
                type="submit"
                className="review-submit-btn"
                disabled={isReviewing}
              >
                {isReviewing ? "Saving..." : "Submit Review"}
              </button>
            </form>

            <div className="review-list">
              {product.reviews?.length > 0 ? (
                product.reviews.map(review => (
                  <article key={review.id} className="review-card">
                    <div className="review-avatar">
                      {(review.customerName || "C")
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="review-content">
                      <div className="review-header">
                        <strong>
                          {review.customerName}
                        </strong>
                        {formatReviewDate(review.createdAt) && (
                          <span className="review-date">
                            {formatReviewDate(review.createdAt)}
                          </span>
                        )}
                      </div>

                      <div className="review-item-stars" aria-label={`${review.rating} stars`}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <span
                            key={star}
                            className={
                              star <= Number(review.rating || 0)
                                ? "filled"
                                : "empty"
                            }
                          >
                            {star <= Number(review.rating || 0) ? "★" : "☆"}
                          </span>
                        ))}
                      </div>

                      {review.comment && (
                        <p className="review-comment-text">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <div className="no-reviews-box">
                  <p className="no-reviews-title">No reviews yet</p>
                  <p className="no-reviews-sub">
                    Be the first to review this Kashmiri handcrafted item.
                  </p>
                </div>
              )}
            </div>
          </section>

        </div>

      </div>

      {/* FULLSCREEN IMAGE MODAL */}
      {previewOpen && (
        <div
          className="image-preview-modal"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewOpen(false)}
        >
          <button
            type="button"
            className="image-preview-close"
            onClick={() => setPreviewOpen(false)}
            aria-label="Close preview"
          >
            ✕ Close
          </button>
          <img
            src={activeImage}
            alt={product.name}
            onError={handleImageFallback}
          />
        </div>
      )}

    </div>
  );
}

export default ProductDetails;

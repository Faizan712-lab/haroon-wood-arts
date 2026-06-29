import "./ProductDetails.css";

import {
  useNavigate,
  useParams
} from "react-router-dom";

import {
  useContext,
  useEffect,
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
    <div className="product-rating-summary">
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

      <span>
        {count > 0
          ? `${safeRating.toFixed(1)} (${count} ${count === 1 ? "review" : "reviews"})`
          : "No reviews yet"}
      </span>
    </div>
  );
}

function formatReviewDate(value) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

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
  const navigate =
    useNavigate();

  const { addToCart } =
    useContext(CartContext);

  const {
    isWishlisted,
    toggleWishlist
  } =
    useContext(WishlistContext);

  const [product,
    setProduct] =
    useState(null);

  const [loading,
    setLoading] =
    useState(true);

  const [selectedSizeIndex,
    setSelectedSizeIndex] =
    useState(null);

  const [rating,
    setRating] =
    useState(5);

  const [hoverRating,
    setHoverRating] =
    useState(0);

  const [comment,
    setComment] =
    useState("");

  const [isReviewing,
    setIsReviewing] =
    useState(false);

  const [loadError,
    setLoadError] =
    useState("");

  /* GET PRODUCT */

  useEffect(() => {

    async function fetchProduct() {

      try {

        setLoading(true);
        setLoadError("");

        const response = await fetch(
          getApiUrl(`/api/products/${id}`),
          {
            cache: "no-store"
          }
        );

        const data =
          await response.json();

        if (response.ok && data.success && data.product) {

          setProduct(
            data.product
          );

          return;

        }

        const listResponse = await fetch(
          getApiUrl("/api/products"),
          {
            cache: "no-store"
          }
        );

        const listData =
          await listResponse.json();

        if (listResponse.ok && listData.success) {

          const matchedProduct =
            (listData.products || []).find(item =>
              String(item.id) === String(id)
            );

          if (matchedProduct) {

            setProduct(matchedProduct);
            return;

          }

        }

        {
          const message =
            data.message || "Product not found";

          setLoadError(message);

          setProduct(null);
          toast.error(message);

        }

      } catch (error) {

        console.error(
          "Failed to load product:",
          error
        );

        setLoadError(
          "Unable to load this product right now."
        );

        setProduct(null);
        toast.error(
          "Unable to load this product right now."
        );

      } finally {

        setLoading(false);

      }

    }

    fetchProduct();

  }, [id]);

  if (loading) {

    return (

      <div className="product-not-found">

        <div className="product-state-card">
          <span className="product-loader"></span>
          <h1>
            Loading product
          </h1>
          <p>
            Fetching the latest details from the store.
          </p>
        </div>

      </div>

    );

  }

  /* NOT FOUND */

  if (!product) {

    return (

      <div className="product-not-found">

        <div className="product-state-card">
          <h1>
            Product not found
          </h1>
          <p>
            {loadError || "This product may have been removed or is unavailable."}
          </p>
          <button
            type="button"
            onClick={() =>
              navigate("/shop")
            }
          >
            Back to Shop
          </button>
        </div>

      </div>

    );

  }

  const variants =
    getProductVariants(product);

  const selectedSize =
    variants[selectedSizeIndex];

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
    if (isOutOfStock(product)) {
      return;
    }

    if (variants.length > 0 && !selectedSize) {
      toast.error("Please select a size");
      return;
    }

    addToCart({
      ...product,
      price: displayPrice,
      productId: product.id,
      variantId:
        selectedSize?.id,
      variantLabel:
        selectedSize?.size ||
        selectedSize?.label,
      variantDimensions:
        selectedSize?.dimensions
    });
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

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to save review"
        );
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

      <div className="product-details-container">

        {/* LEFT IMAGE */}

        <div className="product-left">

          <div className="image-container product-details-image-container">
            <img
              src={product.image || PRODUCT_PLACEHOLDER}
              alt={product.name}
              onError={handleImageFallback}
            />

            {getStockLabel(product) && (
              <span
                className={
                  isOutOfStock(product)
                    ? "stock-badge out"
                    : "stock-badge low"
                }
              >
                {getStockLabel(product)}
              </span>
            )}

            <button
              type="button"
              className={
                isWishlisted(product.id)
                  ? "wishlist-heart saved"
                  : "wishlist-heart"
              }
              aria-label="Toggle wishlist"
              onClick={() =>
                toggleWishlist(product)
              }
            >
              {isWishlisted(product.id) ? "♥" : "♡"}
            </button>
          </div>

        </div>

        {/* RIGHT INFO */}

        <div className="product-right">

          <h1>
            {product.name}
          </h1>

          <p className="product-price">

            {hasDiscount && (
              <span>
                Rs. {originalPrice}
              </span>
            )}

            Rs. {displayPrice}

            {hasDiscount && (
              <small className="discount-badge">
                {product.discountPercent}% OFF
              </small>
            )}

          </p>

          <RatingStars
            rating={product.averageRating}
            reviewCount={product.reviewCount}
          />

          {variants.length > 0 && (

            <div className="product-size-panel">

              <h3>
                Select Size
              </h3>

              <div className="product-size-options">

                {variants.map((size, index) => (

                  <button
                    key={size.id || index}
                    type="button"
                    className={
                      selectedSizeIndex === index
                        ? "size-option active"
                        : "size-option"
                    }
                    onClick={() =>
                      setSelectedSizeIndex(index)
                    }
                  >
                    <strong>
                      {size.size || size.label}
                    </strong>
                    {size.dimensions && (
                      <span>
                        {size.dimensions}
                      </span>
                    )}
                    {size.stock !== undefined && (
                      <span>
                        Stock: {size.stock}
                      </span>
                    )}
                    {size.price && (
                      <small>
                        Rs. {size.discountedPrice || size.price}
                      </small>
                    )}
                  </button>

                ))}

              </div>

              {selectedSizeIndex === null && (
                <p className="size-warning">
                  Please select a size
                </p>
              )}

            </div>

          )}

          <p className="product-description">

            {product.description}

          </p>

          <button

            className="add-cart-btn"

            onClick={handleAddToCart}
            disabled={
              isOutOfStock(product) ||
              (
                variants.length > 0 &&
                !selectedSize
              )
            }

          >

            {isOutOfStock(product)
              ? "Out of Stock"
              : "Add To Cart"}

          </button>

          <section className="product-review-panel">

            <h2>
              Customer Reviews
            </h2>

            <form
              className="review-form"
              onSubmit={submitReview}
            >
              <h3>
                Write a review
              </h3>

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

              <textarea
                placeholder="Write a review"
                value={comment}
                onChange={(e) =>
                  setComment(e.target.value)
                }
              />

              <button
                type="submit"
                disabled={isReviewing}
              >
                {isReviewing ? "Saving..." : "Submit Review"}
              </button>
            </form>

            <div className="review-list">
              {product.reviews?.length > 0 ? (
                product.reviews.map(review => (
                  <article key={review.id}>
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
                          <span>
                            {formatReviewDate(review.createdAt)}
                          </span>
                        )}
                      </div>

                      <div className="review-item-stars">
                        {[1, 2, 3, 4, 5].map(star => (
                          <span
                            key={star}
                            className={
                              star <= Number(review.rating || 0)
                                ? "filled"
                                : ""
                            }
                          >
                            {star <= Number(review.rating || 0) ? "★" : "☆"}
                          </span>
                        ))}
                      </div>

                    {review.comment && (
                      <p>
                        {review.comment}
                      </p>
                    )}
                    </div>
                  </article>
                ))
              ) : (
                <p>
                  No reviews yet.
                </p>
              )}
            </div>

          </section>

        </div>

      </div>

    </div>

  );

}

export default ProductDetails;

import "./Wishlist.css";

import {
  useContext,
  useEffect,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import {
  WishlistContext
} from "../context/WishlistContext";

import {
  PRODUCT_PLACEHOLDER,
  getPrimaryImage,
  handleImageFallback
} from "../utils/imageFallback";

import {
  getStockLabel,
  isOutOfStock
} from "../utils/productDisplay";

import {
  FaArrowLeft,
  FaHeart,
  FaRegHeart,
  FaEye,
  FaShoppingBag
} from "react-icons/fa";

function Wishlist() {
  const navigate = useNavigate();

  const {
    items = [],
    toggleWishlist,
    reloadWishlist
  } = useContext(WishlistContext);

  const [loading, setLoading] = useState(!items || items.length === 0);

  useEffect(() => {
    let mounted = true;
    if (items && items.length > 0) {
      setLoading(false);
      return;
    }

    if (reloadWishlist) {
      reloadWishlist().finally(() => {
        if (mounted) setLoading(false);
      });
    } else {
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [reloadWishlist, items]);

  return (
    <main className="wishlist-page">
      <div className="wishlist-container">
        {/* Back to Profile Navigation */}
        <button
          className="wishlist-back-btn"
          type="button"
          onClick={() => navigate("/profile")}
        >
          <FaArrowLeft aria-hidden="true" />
          <span>Back to Profile</span>
        </button>

        {/* Page Header */}
        <header className="wishlist-header">
          <div className="wishlist-header-text">
            <span className="wishlist-tag">SAVED FAVOURITES</span>
            <h1>My Wishlist</h1>
            <p className="wishlist-subtitle">
              Your saved favourites, all in one place.
            </p>
          </div>

          {!loading && items.length > 0 && (
            <div className="wishlist-count-badge">
              <span>{items.length}</span> {items.length === 1 ? "item saved" : "items saved"}
            </div>
          )}
        </header>

        {/* Content States */}
        {loading ? (
          <div className="wishlist-grid">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="wishlist-skeleton-card" aria-hidden="true">
                <div className="wishlist-skeleton-img" />
                <div className="wishlist-skeleton-content">
                  <div className="wishlist-skeleton-line short" />
                  <div className="wishlist-skeleton-line title" />
                  <div className="wishlist-skeleton-line price" />
                  <div className="wishlist-skeleton-btn" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="wishlist-empty-card">
            <div className="wishlist-empty-icon" aria-hidden="true">
              <FaRegHeart />
            </div>
            <h2>Your wishlist is empty</h2>
            <p>
              Save your favourite handcrafted pieces here and come back to them anytime.
            </p>
            <button
              type="button"
              className="wishlist-empty-cta"
              onClick={() => navigate("/shop")}
            >
              <FaShoppingBag aria-hidden="true" />
              <span>Explore Products</span>
            </button>
          </div>
        ) : (
          <div className="wishlist-grid">
            {items.map(product => {
              const productId = product.productId || product.id;
              const rawPrice = Number(product.price || 0);
              const discountPercent = Number(product.discountPercent || product.discount_percent || 0);
              const discountedPrice = product.discountedPrice
                ? Number(product.discountedPrice)
                : discountPercent > 0 && rawPrice > 0
                  ? Math.round(rawPrice * (1 - discountPercent / 100))
                  : rawPrice;

              const hasDiscount = discountPercent > 0 && discountedPrice < rawPrice;
              const stockLabel = getStockLabel(product);
              const outOfStock = isOutOfStock(product);
              const avgRating = Number(product.averageRating || product.average_rating || 0);
              const reviewCount = Number(product.reviewCount || product.review_count || 0);

              return (
                <article
                  key={productId}
                  className={`wishlist-card ${outOfStock ? "out-of-stock" : ""}`}
                >
                  {/* Product Image Area */}
                  <div
                    className="wishlist-image-container"
                    onClick={() => navigate(`/product/${productId}`)}
                  >
                    <img
                      src={getPrimaryImage(product) || PRODUCT_PLACEHOLDER}
                      alt={product.name}
                      loading="lazy"
                      onError={handleImageFallback}
                    />

                    {/* Stock Status Badge */}
                    {stockLabel && (
                      <span
                        className={`wishlist-stock-badge ${outOfStock ? "out" : "low"}`}
                      >
                        {stockLabel}
                      </span>
                    )}

                    {/* Remove Heart Button */}
                    <button
                      type="button"
                      className="wishlist-remove-btn"
                      aria-label={`Remove ${product.name} from wishlist`}
                      title="Remove from wishlist"
                      onClick={e => {
                        e.stopPropagation();
                        toggleWishlist({
                          ...product,
                          id: productId
                        });
                      }}
                    >
                      <FaHeart className="wishlist-heart-icon" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Product Info & Actions */}
                  <div className="wishlist-card-content">
                    {product.category && (
                      <span className="wishlist-category">{product.category}</span>
                    )}

                    <h2
                      className="wishlist-title"
                      title={product.name}
                      onClick={() => navigate(`/product/${productId}`)}
                    >
                      {product.name}
                    </h2>

                    {avgRating > 0 && (
                      <div
                        className="wishlist-rating"
                        aria-label={`${avgRating.toFixed(1)} out of 5 stars`}
                      >
                        <span className="wishlist-rating-stars">
                          {[1, 2, 3, 4, 5].map(star => (
                            <span
                              key={star}
                              className={
                                star <= Math.round(avgRating)
                                  ? "star filled"
                                  : "star"
                              }
                            >
                              ★
                            </span>
                          ))}
                        </span>
                        <span className="wishlist-review-count">
                          ({reviewCount})
                        </span>
                      </div>
                    )}

                    {/* Price Block */}
                    <div className="wishlist-price-row">
                      {hasDiscount ? (
                        <>
                          <span className="wishlist-price">
                            Rs. {discountedPrice.toLocaleString("en-IN")}
                          </span>
                          <span className="wishlist-old-price">
                            Rs. {rawPrice.toLocaleString("en-IN")}
                          </span>
                          <span className="wishlist-discount-badge">
                            {discountPercent}% OFF
                          </span>
                        </>
                      ) : (
                        <span className="wishlist-price">
                          Rs. {rawPrice > 0 ? rawPrice.toLocaleString("en-IN") : product.price}
                        </span>
                      )}
                    </div>

                    {/* Primary Action Button */}
                    <button
                      type="button"
                      className="wishlist-action-btn"
                      onClick={() => navigate(`/product/${productId}`)}
                    >
                      <span>View Details</span>
                      <FaEye aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default Wishlist;

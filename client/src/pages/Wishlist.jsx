import "./Wishlist.css";

import {
  useContext
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

function Wishlist() {
  const navigate =
    useNavigate();

  const {
    items,
    toggleWishlist
  } = useContext(WishlistContext);

  return (
    <main className="wishlist-page">
      <header className="wishlist-header">
        <p>Saved Products</p>
        <h1>Wishlist</h1>
      </header>

      {items.length === 0 ? (
        <div className="wishlist-empty">
          <h2>No saved products yet</h2>
          <button
            type="button"
            onClick={() =>
              navigate("/shop")
            }
          >
            Browse Products
          </button>
        </div>
      ) : (
        <div className="wishlist-grid">
          {items.map(product => (
            <article
              key={product.productId || product.id}
              className={
                isOutOfStock(product)
                  ? "wishlist-card out-of-stock"
                  : "wishlist-card"
              }
            >
              <div className="image-container wishlist-image-container">
                <img
                  src={getPrimaryImage(product) || PRODUCT_PLACEHOLDER}
                  alt={product.name}
                  loading="lazy"
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
                  className="wishlist-heart saved"
                  aria-label="Remove from wishlist"
                  onClick={() =>
                    toggleWishlist(product)
                  }
                >
                  ♥
                </button>
              </div>

              <h2>{product.name}</h2>
              <p>{product.category}</p>
              <strong>Rs. {product.price}</strong>

              <button
                type="button"
                onClick={() =>
                  navigate(`/product/${product.productId || product.id}`)
                }
              >
                View Details
              </button>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

export default Wishlist;

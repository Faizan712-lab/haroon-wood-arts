import "./Cart.css";

import { useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FaTrashAlt, FaRedo, FaExclamationTriangle, FaShieldAlt } from "react-icons/fa";

import { CartContext } from "../context/CartContext";

import {
  PRODUCT_PLACEHOLDER,
  getPrimaryImage,
  handleImageFallback
} from "../utils/imageFallback";

import { getVariantLabel } from "../utils/productDisplay";

function Cart() {
  const navigate = useNavigate();

  const {
    cartItems,
    removeFromCart,
    removeUnavailableItems,
    clearReconcileNotices,
    increaseQty,
    decreaseQty,
    getTotalPrice,
    reconcileCart,
    isReconciling,
    reconcileError,
    reconcileNotices,
    hasUnavailableItems
  } = useContext(CartContext);

  // Validate prices authoritatively on initial mount
  useEffect(() => {
    reconcileCart();
  }, [reconcileCart]);

  const total = getTotalPrice();

  function handleProceedToCheckout() {
    if (hasUnavailableItems) {
      toast.error("Please remove unavailable items before proceeding to checkout.");
      return;
    }

    if (cartItems.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    navigate("/checkout");
  }

  const totalItemCount = cartItems.reduce(
    (sum, item) => sum + (item.isUnavailable ? 0 : Number(item.quantity || 1)),
    0
  );

  return (
    <div className="cart-page">
      <div className="cart-container">
        {/* HEADER ROW */}
        <div className="cart-header-row">
          <div className="cart-header-left">
            <h1>Your Cart</h1>
            {cartItems.length > 0 && (
              <span className="cart-count-badge">
                {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
              </span>
            )}
            {isReconciling && (
              <span className="cart-validating-badge" role="status" aria-live="polite">
                <span className="cart-spinner-dot" /> Checking prices...
              </span>
            )}
          </div>

          {cartItems.length > 0 && (
            <div className="cart-header-actions">
              <button
                type="button"
                className="cart-refresh-btn"
                onClick={() => reconcileCart(null, true)}
                disabled={isReconciling}
                title="Verify prices against server catalog"
              >
                <FaRedo className={`cart-refresh-icon ${isReconciling ? "spin-icon" : ""}`} />
                <span>{isReconciling ? "Checking..." : "Refresh Prices"}</span>
              </button>
            </div>
          )}
        </div>

        {/* VALIDATION ERROR BANNER */}
        {reconcileError && (
          <div className="cart-notice-banner cart-notice-banner--error" role="alert">
            <div className="cart-notice-content">
              <div className="cart-notice-title-row">
                <FaExclamationTriangle className="cart-notice-icon" />
                <strong>Price Verification Notice</strong>
              </div>
              <p>{reconcileError}</p>
            </div>
            <button
              type="button"
              className="cart-retry-btn"
              onClick={() => reconcileCart(null, true)}
              disabled={isReconciling}
            >
              {isReconciling ? "Checking..." : "Retry"}
            </button>
          </div>
        )}

        {/* Price Changes Alert Banner */}
        {reconcileNotices.priceChanges && reconcileNotices.priceChanges.length > 0 && (
          <div className="cart-notice-banner cart-notice-banner--info">
            <div className="cart-notice-content">
              <strong>Price Updates in Your Cart:</strong>
              <ul>
                {reconcileNotices.priceChanges.map((change, index) => (
                  <li key={index}>
                    <strong>{change.name}</strong>: Price updated from ₹{Number(change.oldPrice).toFixed(2)} → ₹{Number(change.currentPrice).toFixed(2)}.
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              className="cart-notice-dismiss"
              onClick={clearReconcileNotices}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Unavailable Items Alert Banner */}
        {hasUnavailableItems && (
          <div className="cart-notice-banner cart-notice-banner--warning">
            <div className="cart-notice-content">
              <strong>Items Currently Unavailable:</strong>
              <p>
                One or more items in your cart are no longer available in the catalog or selected options.
                Please remove them to proceed with checkout.
              </p>
            </div>
            <button
              type="button"
              className="cart-remove-unavailable-btn"
              onClick={removeUnavailableItems}
            >
              Remove Unavailable Items
            </button>
          </div>
        )}

        {cartItems.length === 0 ? (
          <div className="cart-empty-state">
            <div className="cart-empty-icon">🛒</div>
            <h2>Your cart is empty</h2>
            <p>Discover our handcrafted wooden art, tables, clocks, and home decor.</p>
            <button
              type="button"
              className="cart-continue-btn"
              onClick={() => navigate("/shop")}
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="cart-content-grid">
            {/* PRODUCT CARDS LIST */}
            <div className="cart-items-column">
              <div className="cart-items-list">
                {cartItems.map(item => {
                  const itemKey = item.cartKey || `${item.productId || item.id}-${item.variantId || "default"}`;
                  const isUnavailable = Boolean(item.isUnavailable);
                  const itemPrice = Number(item.price || 0);
                  const itemQty = Number(item.quantity || 1);
                  const lineTotal = itemPrice * itemQty;
                  const variantLabel = getVariantLabel(item);

                  return (
                    <div
                      key={itemKey}
                      className={`cart-item-card ${isUnavailable ? "cart-item-card--unavailable" : ""}`}
                    >
                      {/* 1. THUMBNAIL */}
                      <div className="cart-item-thumb-wrapper">
                        <img
                          src={getPrimaryImage(item) || PRODUCT_PLACEHOLDER}
                          alt={item.name}
                          loading="lazy"
                          onError={handleImageFallback}
                          className="cart-item-thumb"
                        />
                      </div>

                      {/* 2. DETAILS */}
                      <div className="cart-item-details">
                        <div className="cart-item-title-row">
                          <Link
                            to={`/product/${item.productId || item.id}`}
                            className="cart-item-name"
                          >
                            {item.name}
                          </Link>
                          {isUnavailable && (
                            <span className="cart-badge cart-badge--out-of-stock">
                              {item.unavailableReason || "Unavailable"}
                            </span>
                          )}
                        </div>

                        {variantLabel && (
                          <div className="cart-item-variant">
                            <span>Option:</span> {variantLabel}
                          </div>
                        )}

                        <div className="cart-item-unit-price">
                          <span className={isUnavailable ? "cart-price--strikethrough" : ""}>
                            ₹{itemPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="cart-unit-label"> each</span>
                        </div>

                        {isUnavailable && (
                          <p className="cart-unavailable-desc">
                            Cannot be purchased. Please remove from cart.
                          </p>
                        )}
                      </div>

                      {/* 3. QUANTITY CONTROLS */}
                      <div className="cart-item-qty-section">
                        {!isUnavailable ? (
                          <div className="cart-qty-selector">
                            <button
                              type="button"
                              className="cart-qty-btn"
                              onClick={() => decreaseQty(itemKey)}
                              disabled={itemQty <= 1}
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <span className="cart-qty-value">{itemQty}</span>
                            <button
                              type="button"
                              className="cart-qty-btn"
                              onClick={() => increaseQty(itemKey)}
                              disabled={itemQty >= 500}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <div className="cart-qty-placeholder">—</div>
                        )}
                      </div>

                      {/* 4. LINE TOTAL */}
                      <div className="cart-item-total-section">
                        <span className="cart-item-total-price">
                          ₹{lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* 5. REMOVE ACTION */}
                      <div className="cart-item-remove-section">
                        <button
                          type="button"
                          className="cart-item-remove-btn"
                          onClick={() => removeFromCart(itemKey)}
                          title={`Remove ${item.name} from cart`}
                        >
                          <FaTrashAlt className="cart-remove-icon" />
                          <span className="cart-remove-text">Remove</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ORDER SUMMARY COLUMN */}
            <div className="cart-summary-column">
              <div className="cart-summary-card">
                <h2 className="cart-summary-heading">Order Summary</h2>

                <div className="cart-summary-rows">
                  <div className="cart-summary-row">
                    <span className="cart-summary-label">
                      Items Subtotal ({totalItemCount} {totalItemCount === 1 ? "item" : "items"})
                    </span>
                    <span className="cart-summary-val">
                      ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="cart-summary-row cart-summary-row--shipping">
                    <span className="cart-summary-label">Shipping</span>
                    <span className="cart-summary-val cart-free-shipping">Calculated at Checkout</span>
                  </div>
                </div>

                <div className="cart-summary-divider" />

                <div className="cart-summary-row cart-summary-row--total">
                  <span className="cart-summary-total-label">Subtotal</span>
                  <strong className="cart-summary-total-val">
                    ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </div>

                {hasUnavailableItems && (
                  <p className="cart-summary-warning">
                    Subtotal excludes unavailable items. Please remove them before checkout.
                  </p>
                )}

                <button
                  type="button"
                  className={`checkout-btn ${hasUnavailableItems ? "checkout-btn--disabled" : ""}`}
                  onClick={handleProceedToCheckout}
                  disabled={hasUnavailableItems}
                >
                  {hasUnavailableItems ? "Resolve Unavailable Items" : "Proceed to Checkout"}
                </button>

                <div className="cart-secure-notice">
                  <FaShieldAlt className="cart-shield-icon" />
                  <span>Guaranteed safe & secure checkout</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Cart;

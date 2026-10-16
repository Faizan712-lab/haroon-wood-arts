import "./Cart.css";

import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

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
    reconcileNotices,
    hasUnavailableItems
  } = useContext(CartContext);

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

  return (
    <div className="cart">
      <div className="cart-header-row">
        <h1>Your Cart</h1>
        {cartItems.length > 0 && (
          <button
            type="button"
            className="cart-refresh-btn"
            onClick={() => reconcileCart()}
            disabled={isReconciling}
          >
            {isReconciling ? "Checking prices..." : "↻ Refresh Cart"}
          </button>
        )}
      </div>

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
              One or more items in your cart are currently out of stock or no longer available.
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
        <div className="cart-empty">
          <p>Your cart is empty</p>
          <button
            type="button"
            className="cart-continue-btn"
            onClick={() => navigate("/shop")}
          >
            Continue Shopping
          </button>
        </div>
      ) : (
        <>
          <div className="cart-items-list">
            {cartItems.map(item => {
              const itemKey = item.cartKey || `${item.productId || item.id}-${item.variantId || "default"}`;
              const isUnavailable = Boolean(item.isUnavailable);

              return (
                <div
                  key={itemKey}
                  className={`cart-item ${isUnavailable ? "cart-item--unavailable" : ""}`}
                >
                  {/* LEFT SIDE */}
                  <div className="cart-left">
                    <img
                      src={getPrimaryImage(item) || PRODUCT_PLACEHOLDER}
                      alt={item.name}
                      loading="lazy"
                      onError={handleImageFallback}
                    />

                    <div className="cart-details">
                      <div className="cart-title-row">
                        <h3>{item.name}</h3>
                        {isUnavailable && (
                          <span className="cart-badge cart-badge--out-of-stock">
                            {item.unavailableReason || "Unavailable"}
                          </span>
                        )}
                      </div>

                      <p className={`cart-price ${isUnavailable ? "cart-price--strikethrough" : ""}`}>
                        ₹ {Number(item.price || 0).toFixed(2)}
                      </p>

                      {getVariantLabel(item) && (
                        <p className="cart-variant">
                          {getVariantLabel(item)}
                        </p>
                      )}

                      {/* QUANTITY */}
                      {!isUnavailable ? (
                        <div className="quantity">
                          <button
                            type="button"
                            onClick={() => decreaseQty(itemKey)}
                            disabled={item.quantity <= 1}
                          >
                            -
                          </button>

                          <span>{item.quantity}</span>

                          <button
                            type="button"
                            onClick={() => increaseQty(itemKey)}
                            disabled={item.availableStock !== undefined && item.quantity >= item.availableStock}
                          >
                            +
                          </button>

                          {item.availableStock !== undefined && item.availableStock <= 5 && item.availableStock > 0 && (
                            <span className="cart-low-stock-label">
                              Only {item.availableStock} left
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="cart-unavailable-desc">
                          Cannot be purchased. Please remove from cart.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* REMOVE BUTTON */}
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeFromCart(itemKey)}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>

          {/* SUMMARY */}
          <div className="cart-summary">
            <div className="cart-summary-info">
              <span className="cart-summary-label">Subtotal</span>
              <strong className="cart-total">₹ {total.toFixed(2)}</strong>
            </div>

            {hasUnavailableItems && (
              <p className="cart-summary-warning">
                Subtotal excludes unavailable items. Remove them to proceed to checkout.
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
          </div>
        </>
      )}
    </div>
  );
}

export default Cart;

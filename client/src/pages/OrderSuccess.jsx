import "./OrderSuccess.css";

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CheckoutStepper from "../components/CheckoutStepper";

import {
  PRODUCT_PLACEHOLDER,
  getPrimaryImage,
  handleImageFallback
} from "../utils/imageFallback";

function formatHumanDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

// Pre-computed tasteful confetti burst particles in Haroon Stores brand palette
const CONFETTI_PARTICLES = Array.from({ length: 28 }, (_, i) => {
  const angle = (i / 28) * 360 + ((i % 3) * 8 - 8);
  const rad = (angle * Math.PI) / 180;
  const distance = 58 + (i % 6) * 11;
  const tx = Math.round(Math.cos(rad) * distance);
  const ty = Math.round(Math.sin(rad) * distance);

  const colors = [
    "#684832", // Coffee brown
    "#8d6346", // Warm brown
    "#d4af37", // Elegant gold accent
    "#c5a880", // Cream gold
    "#2e7d32", // Forest green
    "#4caf50", // Soft vibrant green
    "#e8d8c3"  // Light cream
  ];
  const color = colors[i % colors.length];
  const shapes = ["disc", "strip", "diamond"];
  const shape = shapes[i % shapes.length];
  const size = shape === "strip" ? 7 : shape === "diamond" ? 6 : 5;
  const delay = 0.22 + (i % 5) * 0.04;
  const duration = 2.8 + (i % 4) * 0.25;
  const rot = (i * 53) % 360;

  return { id: i, tx, ty, color, shape, size, delay, duration, rot };
});

function OrderSuccess() {
  const location = useLocation();
  const navigate = useNavigate();

  const order = location.state?.order;

  // Trigger animation ONLY on first arrival for a newly confirmed order
  const [shouldAnimate] = useState(() => {
    if (!order?.id) return false;
    if (typeof window === "undefined") return false;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return false;
    }
    try {
      const animKey = `haroon_order_anim_${order.id}`;
      if (!sessionStorage.getItem(animKey)) {
        sessionStorage.setItem(animKey, "true");
        return true;
      }
    } catch {
      return false;
    }
    return false;
  });

  const [animFinished, setAnimFinished] = useState(!shouldAnimate);

  useEffect(() => {
    if (!shouldAnimate) return;

    // Remove celebratory confetti and temporary animation elements after ~4s
    const timer = setTimeout(() => {
      setAnimFinished(true);
    }, 4200);

    return () => clearTimeout(timer);
  }, [shouldAnimate]);

  if (!order) {
    return (
      <div className="success-page">
        <div className="success-card success-card--empty">
          <h2 className="success-empty-title">No Order Found</h2>
          <p className="success-empty-text">We couldn't locate recent order details.</p>
          <button
            className="success-btn-primary"
            type="button"
            onClick={() => navigate("/")}
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const isCod = order.paymentMode === "COD";
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="success-page">
      <CheckoutStepper current={2} />

      <main className={`success-card ${shouldAnimate && !animFinished ? "success-card--animating" : ""}`}>
        {/* Success Icon & Heading */}
        <div className={`success-banner ${shouldAnimate && !animFinished ? "success-banner--animating" : ""}`}>
          <div className="success-icon-wrap">
            {shouldAnimate && !animFinished && (
              <>
                <div className="success-pulse-ring" aria-hidden="true" />
                <div className="success-confetti-wrap" aria-hidden="true">
                  {CONFETTI_PARTICLES.map((p) => (
                    <span
                      key={p.id}
                      className={`success-confetti-piece success-confetti-piece--${p.shape}`}
                      style={{
                        "--tx": `${p.tx}px`,
                        "--ty": `${p.ty}px`,
                        "--rot": `${p.rot}deg`,
                        "--bg": p.color,
                        "--delay": `${p.delay}s`,
                        "--duration": `${p.duration}s`,
                        "--size": `${p.size}px`
                      }}
                    />
                  ))}
                </div>
              </>
            )}

            <div
              className={`success-icon-circle ${shouldAnimate && !animFinished ? "success-icon-circle--animating" : ""}`}
              aria-hidden="true"
            >
              {shouldAnimate ? (
                <svg
                  className={`success-checkmark-svg ${!animFinished ? "success-checkmark-svg--drawing" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span className="success-checkmark">✓</span>
              )}
            </div>
          </div>

          <h1 className="success-title">Order Placed</h1>
          <p className="success-subtitle">
            Your order has been confirmed and will be prepared for delivery.
          </p>
        </div>

        {/* Compact Order Details Header */}
        <div className="success-meta-grid">
          <div className="meta-cell">
            <span className="meta-label">ORDER ID</span>
            <strong className="meta-val">#{order.id}</strong>
          </div>

          <div className="meta-cell">
            <span className="meta-label">ORDER DATE</span>
            <span className="meta-val">{formatHumanDate(order.date || order.createdAt)}</span>
          </div>

          <div className="meta-cell meta-cell--payment">
            <span className="meta-label">PAYMENT</span>
            <div className="meta-val">
              <span className="meta-payment-badge">
                {isCod ? "COD" : (order.paymentMode || "Online")}
              </span>
            </div>
          </div>

          {order.deliveryDate && (
            <div className="meta-cell">
              <span className="meta-label">ESTIMATED DELIVERY</span>
              <span className="meta-val">{formatHumanDate(order.deliveryDate)}</span>
            </div>
          )}
        </div>

        <div className="success-divider" />

        {/* Order Items Summary */}
        <section className="success-section" aria-label="Items ordered">
          <h2 className="success-section-heading">
            Items Ordered ({items.length})
          </h2>

          <div className="success-items-list">
            {items.map(item => (
              <div
                key={item.orderItemId || item.id || item.productId}
                className="success-item-row"
              >
                <div className="success-item-thumb">
                  <img
                    src={getPrimaryImage(item) || PRODUCT_PLACEHOLDER}
                    alt={item.name}
                    loading="lazy"
                    onError={handleImageFallback}
                  />
                </div>

                <div className="success-item-info">
                  <span className="success-item-name">{item.name}</span>
                  {(item.variantLabel || item.variantDimensions) && (
                    <span className="success-item-variant">
                      {item.variantLabel || item.variantDimensions}
                    </span>
                  )}
                  <span className="success-item-qty">Qty: {item.quantity}</span>
                </div>

                <div className="success-item-price">
                  ₹{Number(item.lineTotal || (item.price * item.quantity) || 0).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="success-divider" />

        {/* Payment Summary */}
        <section className="success-section" aria-label="Payment summary">
          <h2 className="success-section-heading">Payment Details</h2>

          <div className="success-payment-table">
            <div className="success-summary-row">
              <span className="summary-label">Order Total</span>
              <strong className="summary-val">₹{Number(order.total || 0).toFixed(2)}</strong>
            </div>

            {isCod ? (
              <>
                <div className="success-summary-row success-summary-row--accent">
                  <span className="summary-label">Advance Paid Online (10%)</span>
                  <strong className="summary-val summary-val--green">
                    ₹{Number(order.paid || order.codAdvance || 0).toFixed(2)}
                  </strong>
                </div>

                <div className="success-summary-row">
                  <span className="summary-label">Due on Delivery (90%)</span>
                  <strong className="summary-val">
                    ₹{Number(order.codRemainingOnDelivery ?? order.remaining ?? 0).toFixed(2)}
                  </strong>
                </div>
              </>
            ) : (
              <div className="success-summary-row success-summary-row--accent">
                <span className="summary-label">Paid Online</span>
                <strong className="summary-val summary-val--green">
                  ₹{Number(order.paid || order.total || 0).toFixed(2)}
                </strong>
              </div>
            )}
          </div>
        </section>

        {/* Action Buttons */}
        <div className="success-actions">
          <button
            className="success-btn-primary"
            type="button"
            onClick={() => navigate("/order-details", { state: { order } })}
          >
            View Order Details
          </button>

          <button
            className="success-btn-secondary"
            type="button"
            onClick={() => navigate("/")}
          >
            Continue Shopping
          </button>
        </div>
      </main>
    </div>
  );
}

export default OrderSuccess;

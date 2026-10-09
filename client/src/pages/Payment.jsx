import "./Payment.css";

import {
  FaCreditCard,
  FaHandHolding,
  FaLock,
  FaShieldAlt
} from "react-icons/fa";

import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from "react";

import {
  useLocation
} from "react-router-dom";

import toast from "react-hot-toast";

import {
  CartContext
} from "../context/CartContext";

import {
  getApiUrl
} from "../utils/api";

/* ──────────────────────────────────────────────
   Razorpay Checkout script loader (singleton)
   ────────────────────────────────────────────── */

let razorpayScriptPromise = null;
const CHECKOUT_SESSION_STORAGE_KEY = "haroonCheckoutSessionId";

function createCheckoutSessionId() {
  return crypto.randomUUID();
}

function getCheckoutSessionId() {
  const storedId = localStorage.getItem(CHECKOUT_SESSION_STORAGE_KEY);

  if (/^[a-f0-9-]{36}$/i.test(storedId || "")) {
    return storedId;
  }

  const checkoutSessionId = createCheckoutSessionId();
  localStorage.setItem(CHECKOUT_SESSION_STORAGE_KEY, checkoutSessionId);
  return checkoutSessionId;
}

function clearCheckoutSessionId(checkoutSessionId) {
  if (localStorage.getItem(CHECKOUT_SESSION_STORAGE_KEY) === checkoutSessionId) {
    localStorage.removeItem(CHECKOUT_SESSION_STORAGE_KEY);
  }
}

function loadRazorpayScript() {
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => {
      if (window.Razorpay) {
        resolve(window.Razorpay);
      } else {
        razorpayScriptPromise = null;
        reject(new Error("Razorpay loaded but not available."));
      }
    };

    script.onerror = () => {
      razorpayScriptPromise = null;
      reject(new Error("Failed to load payment gateway. Please check your internet and try again."));
    };

    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

function Payment() {

  const location = useLocation();

  const {
    cartItems,
    getTotalPrice
  } = useContext(CartContext);

  const params = new URLSearchParams(location.search);
  const resumeOrderId = params.get("order");

  const initialPaymentMode =
    params.get("mode") === "Online"
      ? "Online"
      : "COD";

  const checkoutData =
    location.state?.checkoutData ||
    (() => {
      try {
        return JSON.parse(
          sessionStorage.getItem("haroonCheckoutData") || "{}"
        );
      } catch {
        return {};
      }
    })();

  const [coupon, setCoupon] = useState("");

  const [discount, setDiscount] =
    useState(Number(checkoutData.discount || 0));

  const [paymentMode, setPaymentMode] =
    useState(initialPaymentMode);

  const [pendingOrder, setPendingOrder] = useState(null);
  const [resumeLoadError, setResumeLoadError] = useState("");

  const checkoutTotal = Math.max(
    pendingOrder ? Number(pendingOrder.total || 0) : getTotalPrice() - discount,
    0
  );

  const codAdvance = Math.round(checkoutTotal * 10) / 100;
  const codRemaining = Math.round((checkoutTotal - codAdvance) * 100) / 100;
  const isCod = paymentMode === "COD";
  const amountToPay = isCod ? codAdvance : checkoutTotal;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("idle");
  // "idle" | "creating_order" | "loading_razorpay" | "awaiting_payment" | "pending_verification" | "payment_failed"

  const isPaymentInProgress = useRef(false);

  /* ── Delivery date helper ── */

  function getDeliveryDate() {
    const date = new Date();
    date.setDate(date.getDate() + 4);
    return date.toDateString();
  }

  /* ── Payment mode selection ── */

  function selectPaymentMode(nextMode) {
    if (isSubmitting || pendingOrder) return;
    setPaymentMode(nextMode);
  }

  /* ── Coupon ── */

  function applyCoupon() {
    if (coupon.trim().toUpperCase() === "HAROON250") {
      setDiscount(250);
      toast.success("Coupon Applied! ₹250 Discount");
      return;
    }
    setDiscount(0);
    toast.error("Invalid Coupon");
  }

  /* ── Preload Razorpay on mount ── */

  useEffect(() => {
    loadRazorpayScript().catch(() => {
      /* silent preload failure — we'll retry on click */
    });
  }, []);

  useEffect(() => {
    if (!resumeOrderId) return;

    async function loadPendingOrder() {
      try {
        const response = await fetch(getApiUrl(`/api/orders/${resumeOrderId}`), {
          credentials: "include",
          cache: "no-store"
        });
        const data = await response.json();

        if (
          !response.ok ||
          !data.success ||
          data.order?.status !== "Payment Pending" ||
          data.order?.paymentAttemptState !== "resume_window" ||
          !data.order?.paymentResumeExpiresAt ||
          new Date(data.order.paymentResumeExpiresAt).getTime() <= Date.now()
        ) {
          throw new Error(data.message || "This pending payment is no longer available.");
        }

        setPendingOrder(data.order);
        setPaymentMode(data.order.paymentMode === "COD" ? "COD" : "Online");
      } catch (error) {
        setResumeLoadError(error.message || "Unable to load pending payment.");
      }
    }

    loadPendingOrder();
  }, [resumeOrderId]);

  /* ── Main payment handler ── */

  const handlePayment = useCallback(async () => {
    if (
      isPaymentInProgress.current ||
      isSubmitting ||
      paymentStatus === "pending_verification"
    ) return;
    isPaymentInProgress.current = true;
    setIsSubmitting(true);
    setPaymentStatus("creating_order");
    let activeOrderId = null;
    let checkoutOpened = false;
    let activeCheckoutAttemptId = null;

    try {
      /* ── Step 1: Create or resume the internal order ── */

      let internalOrder = pendingOrder;
      let orderId = pendingOrder?.databaseId || pendingOrder?.id;
      const isResumeCheckout = Boolean(resumeOrderId);
      activeOrderId = orderId;

      if (!internalOrder) {
        const total = Math.max(getTotalPrice() - discount, 0);
        const checkoutSessionId = getCheckoutSessionId();
        const orderPayload = {
        createdAt: checkoutData.createdAt || Date.now(),
        cancelUntil: checkoutData.cancelUntil || (Date.now() + 5 * 24 * 60 * 60 * 1000),
        items: cartItems.map(item => ({
          id: item.id,
          productId: item.productId || item.id,
          name: item.name,
          image: item.image,
          quantity: item.quantity,
          price: item.price,
          variantId: item.variantId,
          variantLabel: item.variantLabel,
          variantDimensions: item.variantDimensions
        })),
        customer: checkoutData.customer || "Guest",
        phone: checkoutData.phone || "",
        address: checkoutData.address || "",
        total,
        paid: 0,
        remaining: total,
        paymentMode: isCod ? "COD" : "Online Payment",
        checkoutSessionId,
        status: "Processing",
        deliveryDate: getDeliveryDate()
      };

        const orderRes = await fetch(
        getApiUrl("/api/orders"),
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderPayload)
        }
      );

        const orderData = await orderRes.json();

        if (!orderRes.ok || !orderData.success) {
          if (orderData.checkoutSessionInvalid) {
            clearCheckoutSessionId(checkoutSessionId);
          }
          throw new Error(orderData.message || "Failed to create order");
        }

        internalOrder = orderData.order;
        orderId = internalOrder.databaseId || internalOrder.id;
        activeOrderId = orderId;
        setPendingOrder(internalOrder);
      }

      /* ── Step 2: Create / reuse Razorpay order ── */

      const rpRes = await fetch(
        getApiUrl(`/api/orders/${orderId}/razorpay-order`),
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume: isResumeCheckout })
        }
      );

      const rpData = await rpRes.json();

      if (!rpRes.ok || !rpData.success) {
        throw new Error(rpData.message || "Unable to initialize payment.");
      }

      activeCheckoutAttemptId = rpData.checkoutAttemptId;

      /* ── Step 3: Load Razorpay Checkout ── */

      setPaymentStatus("loading_razorpay");

      let RazorpayClass;
      try {
        RazorpayClass = await loadRazorpayScript();
      } catch {
        throw new Error("Payment gateway could not be loaded. Please check your internet connection and try again.");
      }

      /* ── Step 4: Open Razorpay Checkout ── */

      setPaymentStatus("awaiting_payment");
      checkoutOpened = true;

      const razorpayResponse = await new Promise((resolve, reject) => {
        const options = {
          key: rpData.keyId,
          amount: rpData.amount,
          currency: rpData.currency,
          name: "Haroon Stores",
          description: isCod
            ? `10% Advance for Order ${rpData.orderCode || ""}`
            : `Payment for Order ${rpData.orderCode || ""}`,
          order_id: rpData.razorpayOrderId,
          prefill: {
            name: checkoutData.customer || "",
            contact: checkoutData.phone || ""
          },
          theme: {
            color: "#3e2723"
          },
          modal: {
            ondismiss: () => {
              reject(new Error("__CANCELLED__"));
            },
            escape: true,
            confirm_close: true
          },
          handler: (response) => {
            /* Phase 2: we do NOT verify the signature yet.
               Just capture the response for Phase 3. */
            resolve(response);
          }
        };

        const rzp = new RazorpayClass(options);

        rzp.on("payment.failed", (failResponse) => {
          const desc =
            failResponse?.error?.description ||
            "Payment failed. Please try again.";
          reject(new Error(desc));
        });

        rzp.open();
      });

      /* ── Step 5: Retain the unverified Razorpay response ── */

      /* Phase 2 does not verify the Razorpay signature. Keep the response
         available for Phase 3, but do not finalize this order client-side. */
      sessionStorage.setItem(
        "haroonRazorpayPaymentResponse",
        JSON.stringify({
          orderId,
          orderCode: rpData.orderCode,
          razorpay_payment_id: razorpayResponse.razorpay_payment_id,
          razorpay_order_id: razorpayResponse.razorpay_order_id,
          razorpay_signature: razorpayResponse.razorpay_signature
        })
      );

      setPaymentStatus("pending_verification");
      toast("Payment response received. Verification is pending.", {
        icon: "ℹ️"
      });

    } catch (error) {
      if (error.message === "__CANCELLED__") {
        if (activeOrderId) {
          await fetch(getApiUrl(`/api/orders/${activeOrderId}/payment-checkout-closed`), {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ checkoutAttemptId: activeCheckoutAttemptId })
          }).catch(() => {});
        }
        setPaymentStatus("idle");
        toast("Payment cancelled. You can try again.", {
          icon: "ℹ️"
        });
      } else {
        if (checkoutOpened && activeOrderId) {
          await fetch(getApiUrl(`/api/orders/${activeOrderId}/payment-checkout-closed`), {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ checkoutAttemptId: activeCheckoutAttemptId })
          }).catch(() => {});
        }
        setPaymentStatus("payment_failed");
        toast.error(
          error.message || "Unable to process payment. Please try again."
        );
      }
    } finally {
      setIsSubmitting(false);
      isPaymentInProgress.current = false;
    }
  }, [
    isCod, cartItems, checkoutData, discount,
    getTotalPrice, isSubmitting, paymentStatus, pendingOrder, resumeOrderId
  ]);

  /* ── Button label ── */

  function getButtonLabel() {
    switch (paymentStatus) {
      case "creating_order":
        return "Creating Order…";
      case "loading_razorpay":
        return "Loading Payment…";
      case "awaiting_payment":
        return "Complete Payment…";
      case "pending_verification":
        return "Verification Pending";
      default:
        if (isCod) {
          return `Pay ₹${codAdvance.toFixed(2)} Advance`;
        }
        return `Pay ₹${checkoutTotal.toFixed(2)}`;
    }
  }

  /* ────────────────────────────────────────────
     Render
     ──────────────────────────────────────────── */

  return (

    <div className="payment-page">

      {/* ── Progress stepper ── */}

      <div className="payment-stepper">
        <div className="payment-step done">
          <span>✓</span>
          <p>Address</p>
        </div>
        <div className="payment-line active"></div>
        <div className="payment-step active">
          <span>2</span>
          <p>Payment</p>
        </div>
        <div className="payment-line"></div>
        <div className="payment-step">
          <span>3</span>
          <p>Success</p>
        </div>
      </div>

      <div className="payment-page-title">
        <h1>
          <FaLock style={{ fontSize: 14, marginRight: 6, verticalAlign: "-1px" }} />
          Secure Payment
        </h1>
      </div>

      <div className="payment-shell">

        {/* ════════════════════════════════════
            SUMMARY SIDEBAR
            ════════════════════════════════════ */}

        <aside className="payment-summary-card">

          <div className="payment-page-heading">
            <h1>Order Summary</h1>
            <p>Review your payable amount before placing the order.</p>
          </div>

          <p className="amount-label">
            {isCod ? "Advance to Pay Now" : "Amount to Pay"}
          </p>

          <h2 className="payment-amount">
            ₹{amountToPay.toFixed(2)}
          </h2>

          <div className="payment-mode-pill">
            <span>Mode</span>
            <strong>{isCod ? "Cash on Delivery" : "Pay Online"}</strong>
          </div>

          <div className="payment-price-summary">
            {isCod ? (
              <>
                <div>
                  <span>Order Total</span>
                  <strong>₹{checkoutTotal.toFixed(2)}</strong>
                </div>
                <div className="cod-highlight-advance">
                  <span>
                    <FaLock style={{ fontSize: 9, marginRight: 4, verticalAlign: "0px" }} />
                    Pay 10% advance online
                  </span>
                  <strong>₹{codAdvance.toFixed(2)}</strong>
                </div>
                <div>
                  <span>Pay 90% on delivery</span>
                  <strong>₹{codRemaining.toFixed(2)}</strong>
                </div>
              </>
            ) : (
              <div>
                <span>Order Total</span>
                <strong>₹{checkoutTotal.toFixed(2)}</strong>
              </div>
            )}
          </div>

          <div className="payment-coupon">
            <label htmlFor="payment-coupon-code">Coupon Code</label>
            <div className="payment-coupon-row">
              <input
                id="payment-coupon-code"
                type="text"
                placeholder="Enter coupon code"
                value={coupon}
                onChange={(event) => setCoupon(event.target.value)}
                disabled={isSubmitting || Boolean(pendingOrder)}
              />
              <button type="button" onClick={applyCoupon} disabled={isSubmitting || Boolean(pendingOrder)}>
                Apply
              </button>
            </div>
            {discount > 0 && (
              <p className="payment-coupon-success">
                Coupon applied: ₹{discount.toFixed(2)} saved
              </p>
            )}
          </div>

        </aside>

        {/* ════════════════════════════════════
            PAYMENT METHODS SECTION
            ════════════════════════════════════ */}

        <section className="payment-box">

          <h2 className="payment-box-title">Choose Payment Method</h2>

          {/* ── COD vs Online toggle ── */}

          <div className="payment-method-choice-grid">
            <button
              type="button"
              className={
                isCod
                  ? "payment-choice active"
                  : "payment-choice"
              }
              onClick={() => selectPaymentMode("COD")}
              disabled={isSubmitting || Boolean(pendingOrder)}
            >
              <span className="choice-icon cod-icon">
                <FaHandHolding />
              </span>
              <span>
                <strong>Cash on Delivery</strong>
                <small>Pay 10% advance, 90% on delivery</small>
              </span>
            </button>

            <button
              type="button"
              className={
                !isCod
                  ? "payment-choice active"
                  : "payment-choice"
              }
              onClick={() => selectPaymentMode("Online")}
              disabled={isSubmitting || Boolean(pendingOrder)}
            >
              <span className="choice-icon">
                <FaCreditCard />
              </span>
              <span>
                <strong>Pay Online</strong>
                <small>Pay full amount securely</small>
              </span>
            </button>
          </div>

          {/* ── COD info panel ── */}

          {isCod && (
            <div className="cod-panel">
              <div className="cod-info-header">
                <FaShieldAlt className="cod-shield-icon" />
                <strong>Cash on Delivery</strong>
              </div>
              <div className="cod-breakdown-grid">
                <div className="cod-breakdown-item cod-advance-item">
                  <span className="cod-breakdown-label">Pay now (10% advance)</span>
                  <span className="cod-breakdown-value">₹{codAdvance.toFixed(2)}</span>
                </div>
                <div className="cod-breakdown-item">
                  <span className="cod-breakdown-label">Pay on delivery (90%)</span>
                  <span className="cod-breakdown-value">₹{codRemaining.toFixed(2)}</span>
                </div>
                <div className="cod-breakdown-item cod-total-item">
                  <span className="cod-breakdown-label">Order Total</span>
                  <span className="cod-breakdown-value">₹{checkoutTotal.toFixed(2)}</span>
                </div>
              </div>
              <p className="cod-info-note">
                A 10% advance payment is required to confirm your Cash on Delivery order.
                The remaining amount will be collected at the time of delivery.
              </p>
            </div>
          )}

          {/* ── Online info panel ── */}

          {!isCod && (
            <div className="online-panel">
              <div className="online-info-header">
                <FaLock className="online-lock-icon" />
                <strong>Pay Online — ₹{checkoutTotal.toFixed(2)}</strong>
              </div>
              <p className="online-info-note">
                You will be redirected to Razorpay's secure checkout
                to complete your payment using UPI, cards, net banking, or wallets.
              </p>
            </div>
          )}

          {/* ── Error message ── */}

          {paymentStatus === "payment_failed" && (
            <div className="payment-error-banner">
              <p>Payment was not completed. Please try again.</p>
            </div>
          )}

          {resumeLoadError && (
            <div className="payment-error-banner">
              <p>{resumeLoadError}</p>
            </div>
          )}

          {/* ── Pay button ── */}

          <button
            className={`pay-btn${isSubmitting ? " pay-btn-loading" : ""}`}
            type="button"
            onClick={handlePayment}
            disabled={isSubmitting || paymentStatus === "pending_verification" || Boolean(resumeOrderId && !pendingOrder)}
          >
            {isSubmitting && (
              <span className="pay-btn-spinner" aria-hidden="true"></span>
            )}
            {getButtonLabel()}
          </button>

          <p className="pay-btn-subtext">
            <FaShieldAlt style={{ fontSize: 10, marginRight: 4, verticalAlign: "-1px" }} />
            {isCod
              ? "Secure online advance via Razorpay"
              : "Secured by Razorpay"
            }
          </p>

        </section>

      </div>

    </div>

  );

}

export default Payment;

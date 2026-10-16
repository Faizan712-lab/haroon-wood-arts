import "./Payment.css";

import {
  FaCreditCard,
  FaHandHolding,
  FaUniversity,
  FaWallet
} from "react-icons/fa";

import {
  SiMastercard,
  SiPaytm,
  SiPhonepe,
  SiVisa
} from "react-icons/si";

import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from "react";

import {
  useLocation,
  useNavigate
} from "react-router-dom";

import toast from "react-hot-toast";

import logo from "../assets/logo.png";
import CheckoutStepper from "../components/CheckoutStepper";
import { CartContext } from "../context/CartContext";
import { getApiUrl } from "../utils/api";

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
  const navigate = useNavigate();

  const {
    cartItems,
    getTotalPrice,
    clearCart
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
  const [discount, setDiscount] = useState(Number(checkoutData.discount || 0));
  const [paymentMode, setPaymentMode] = useState(initialPaymentMode);

  const [pendingOrder, setPendingOrder] = useState(null);
  const pendingOrderRef = useRef(null);
  useEffect(() => {
    pendingOrderRef.current = pendingOrder;
  }, [pendingOrder]);

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

  const isPaymentInProgress = useRef(false);

  /* ── Delivery date helper ── */
  function getDeliveryDate() {
    const date = new Date();
    date.setDate(date.getDate() + 4);
    return date.toDateString();
  }

  /* ── Payment mode selection ── */
  function selectPaymentMode(nextMode) {
    if (isSubmitting) return;
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
    loadRazorpayScript().catch(() => {});
  }, []);

  useEffect(() => {
    if (!resumeOrderId && !pendingOrder && cartItems.length === 0) {
      navigate("/cart", { replace: true });
    }
  }, [cartItems.length, resumeOrderId, pendingOrder, navigate]);

  useEffect(() => {
    if (!resumeOrderId) return;
    if (pendingOrderRef.current && (pendingOrderRef.current.databaseId || pendingOrderRef.current.id) == resumeOrderId) {
      return;
    }

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
      const isResumeCheckout = Boolean(
        resumeOrderId ||
        (pendingOrder && pendingOrder.paymentAttemptState === "resume_window")
      );
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
          if (orderRes.status === 409 || orderData.priceChanged) {
            clearCheckoutSessionId(checkoutSessionId);
            toast.error(orderData.message || "Product prices have updated. Please review your cart.");
            navigate("/cart");
            return;
          }
          if (orderRes.status === 400 && (orderData.message?.includes("unavailable") || orderData.message?.includes("stock"))) {
            clearCheckoutSessionId(checkoutSessionId);
            toast.error(orderData.message);
            navigate("/cart");
            return;
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
          body: JSON.stringify({
            resume: isResumeCheckout,
            paymentMode: isCod ? "COD" : "Online Payment"
          })
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
            color: "#684832"
          },
          modal: {
            ondismiss: () => {
              reject(new Error("__CANCELLED__"));
            },
            escape: true,
            confirm_close: true
          },
          handler: (response) => {
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

      /* ── Step 5: Verify the payment server-side ── */
      setPaymentStatus("pending_verification");

      const verifyRes = await fetch(getApiUrl(`/api/orders/${orderId}/razorpay-verify`), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_payment_id: razorpayResponse.razorpay_payment_id,
          razorpay_order_id: razorpayResponse.razorpay_order_id,
          razorpay_signature: razorpayResponse.razorpay_signature
        })
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.message || "Payment verification failed.");
      }

      toast.success("Payment verified and order placed successfully!");

      clearCart();
      sessionStorage.removeItem("haroonCheckoutData");
      clearCheckoutSessionId(getCheckoutSessionId());

      navigate("/order-success", {
        replace: true,
        state: { order: verifyData.order }
      });

    } catch (error) {
      if (error.message === "__CANCELLED__") {
        if (activeOrderId) {
          await fetch(getApiUrl(`/api/orders/${activeOrderId}/payment-checkout-closed`), {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ checkoutAttemptId: activeCheckoutAttemptId })
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.success && data.order) {
                setPendingOrder(data.order);
                navigate(`?order=${activeOrderId}`, { replace: true, state: location.state });
              }
            })
            .catch(() => {});
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
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.success && data.order) {
                setPendingOrder(data.order);
                navigate(`?order=${activeOrderId}`, { replace: true, state: location.state });
              }
            })
            .catch(() => {});
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
    getTotalPrice, isSubmitting, paymentStatus, pendingOrder, resumeOrderId, navigate, location.state
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
        return "Verifying Payment…";
      default:
        if (isCod) {
          return `Pay ₹${codAdvance.toFixed(2)} Advance`;
        }
        return `Pay ₹${checkoutTotal.toFixed(2)} Securely`;
    }
  }

  return (
    <div className="payment-page">
      <header className="payment-header">
        <h1 className="payment-page-title">Payment</h1>
        <p className="payment-page-subtitle">Choose how you would like to pay for your handcrafted order.</p>
      </header>

      <CheckoutStepper current={1} />

      <div className="payment-container">
        {/* ── Main Payment Section ── */}
        <main className="payment-main">
          <div className="payment-method-card">
            <h2 className="payment-section-title">Select Payment Method</h2>

            {/* Selection Cards */}
            <div className="payment-choice-grid">
              <button
                type="button"
                className={`payment-choice-card ${isCod ? "payment-choice-card--selected" : ""}`}
                onClick={() => selectPaymentMode("COD")}
                disabled={isSubmitting}
              >
                <div className="payment-choice-radio">
                  {isCod && <span className="payment-choice-radio-dot" />}
                </div>

                <div className="payment-choice-icon-box">
                  <FaHandHolding className="choice-icon" />
                </div>

                <div className="payment-choice-info">
                  <strong className="payment-choice-title">Cash on Delivery</strong>
                  <span className="payment-choice-desc">Pay 10% advance online, 90% at delivery</span>
                </div>
              </button>

              <button
                type="button"
                className={`payment-choice-card ${!isCod ? "payment-choice-card--selected" : ""}`}
                onClick={() => selectPaymentMode("Online")}
                disabled={isSubmitting}
              >
                <div className="payment-choice-radio">
                  {!isCod && <span className="payment-choice-radio-dot" />}
                </div>

                <div className="payment-choice-icon-box">
                  <FaCreditCard className="choice-icon" />
                </div>

                <div className="payment-choice-info">
                  <strong className="payment-choice-title">Pay Online</strong>
                  <span className="payment-choice-desc">Pay full amount securely with UPI / Cards</span>
                </div>
              </button>
            </div>

            {/* COD Breakdown Panel */}
            {isCod && (
              <div className="cod-breakdown-card">
                <div className="cod-breakdown-header">
                  <span className="cod-breakdown-badge">Cash on Delivery Policy</span>
                  <p className="cod-breakdown-desc">
                    A 10% advance online payment confirms your order. The remaining 90% is collected in cash or UPI at delivery.
                  </p>
                </div>

                <div className="cod-breakdown-table">
                  <div className="cod-breakdown-row cod-breakdown-row--highlight">
                    <span className="cod-row-label">Pay now — 10% advance</span>
                    <strong className="cod-row-value cod-row-value--accent">₹{codAdvance.toFixed(2)}</strong>
                  </div>

                  <div className="cod-breakdown-row">
                    <span className="cod-row-label">Pay on delivery — remaining 90%</span>
                    <strong className="cod-row-value">₹{codRemaining.toFixed(2)}</strong>
                  </div>

                  <div className="cod-breakdown-row cod-breakdown-row--total">
                    <span className="cod-row-label">Order total — 100%</span>
                    <strong className="cod-row-value">₹{checkoutTotal.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Online Payment Panel */}
            {!isCod && (
              <div className="online-info-card">
                <div className="online-info-content">
                  <strong className="online-info-title">100% Secure Online Payment</strong>
                  <p className="online-info-desc">
                    You will complete the full payment of <strong>₹{checkoutTotal.toFixed(2)}</strong> through
                    Razorpay's encrypted checkout using UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, Netbanking, or Wallets.
                  </p>
                </div>
              </div>
            )}

            {/* Accepted Methods Strip */}
            <div className="payment-accepted-section" aria-label="Accepted payment methods">
              <span className="payment-accepted-title">Accepted through Razorpay</span>
              <div className="payment-accepted-grid">
                {/* Official Google Pay brand mark (multicolored G + Pay) */}
                <div className="payment-logo-badge payment-logo-gpay" title="Google Pay" aria-label="Google Pay">
                  <svg width="41" height="17" viewBox="0 0 41 17" fill="none" xmlns="http://www.w3.org/2000/svg" className="gpay-brand-svg">
                    <path d="M19.526 2.635v4.083h2.518c.6 0 1.096-.202 1.488-.605.403-.402.605-.882.605-1.437 0-.544-.202-1.018-.605-1.422-.392-.413-.888-.62-1.488-.62h-2.518zm0 5.52v4.736h-1.504V1.198h3.99c1.013 0 1.873.337 2.582 1.012.72.675 1.08 1.497 1.08 2.466 0 .991-.36 1.819-1.08 2.482-.697.665-1.559.996-2.583.996h-2.485v.001zm7.668 2.287c0 .392.166.718.499.98.332.26.722.391 1.168.391.633 0 1.196-.234 1.692-.701.497-.469.744-1.019.744-1.65-.469-.37-1.123-.555-1.962-.555-.61 0-1.12.148-1.528.442-.409.294-.613.657-.613 1.093m1.946-5.815c1.112 0 1.989.297 2.633.89.642.594.964 1.408.964 2.442v4.932h-1.439v-1.11h-.065c-.622.914-1.45 1.372-2.486 1.372-.882 0-1.621-.262-2.215-.784-.594-.523-.891-1.176-.891-1.96 0-.828.313-1.486.94-1.976s1.463-.735 2.51-.735c.892 0 1.629.163 2.206.49v-.344c0-.522-.207-.966-.621-1.33a2.132 2.132 0 0 0-1.455-.547c-.84 0-1.504.353-1.995 1.062l-1.324-.834c.73-1.045 1.81-1.568 3.238-1.568m11.853.262l-5.02 11.53H34.42l1.864-4.034-3.302-7.496h1.635l2.387 5.749h.032l2.322-5.75z" fill="#3c4043" />
                    <path d="M13.448 7.134c0-.473-.04-.93-.116-1.366H6.988v2.588h3.634a3.11 3.11 0 0 1-1.344 2.042v1.68h2.169c1.27-1.17 2.001-2.9 2.001-4.944" fill="#4285F4" />
                    <path d="M6.988 13.7c1.816 0 3.344-.595 4.459-1.621l-2.169-1.681c-.603.406-1.38.643-2.29.643-1.754 0-3.244-1.182-3.776-2.774H.978v1.731a6.728 6.728 0 0 0 6.01 3.703" fill="#34A853" />
                    <path d="M3.212 8.267a4.034 4.034 0 0 1 0-2.572V3.964H.978A6.678 6.678 0 0 0 .261 6.98c0 1.085.26 2.11.717 3.017l2.234-1.731z" fill="#FBBC05" />
                    <path d="M6.988 2.921c.992 0 1.88.34 2.58 1.008v.001l1.92-1.918C10.324.928 8.804.262 6.989.262a6.728 6.728 0 0 0-6.01 3.702l2.234 1.731c.532-1.592 2.022-2.774 3.776-2.774" fill="#EA4335" />
                  </svg>
                </div>

                <div className="payment-logo-badge payment-logo-phonepe" title="PhonePe">
                  <SiPhonepe aria-label="PhonePe" />
                  <span>PhonePe</span>
                </div>

                <div className="payment-logo-badge payment-logo-paytm" title="Paytm">
                  <SiPaytm aria-label="Paytm" />
                </div>

                <div className="payment-logo-badge payment-logo-visa" title="Visa">
                  <SiVisa aria-label="Visa" />
                </div>

                <div className="payment-logo-badge payment-logo-mastercard" title="Mastercard">
                  <SiMastercard aria-label="Mastercard" />
                </div>

                <div className="payment-logo-badge payment-logo-text" title="Netbanking">
                  <FaUniversity aria-hidden="true" />
                  <span>Netbanking</span>
                </div>

                <div className="payment-logo-badge payment-logo-text" title="Wallets">
                  <FaWallet aria-hidden="true" />
                  <span>Wallets</span>
                </div>
              </div>
              <small className="payment-accepted-disclaimer">
                Payment options shown at checkout depend on your device, bank, and Razorpay availability.
              </small>
            </div>

            {/* Error Banners */}
            {paymentStatus === "payment_failed" && (
              <div className="payment-alert-banner">
                <p>Payment was not completed. Please try again or choose another method.</p>
              </div>
            )}

            {resumeLoadError && (
              <div className="payment-alert-banner">
                <p>{resumeLoadError}</p>
              </div>
            )}

            {/* Primary Action Button */}
            <div className="payment-action-wrap">
              <button
                className={`payment-pay-btn ${isSubmitting ? "payment-pay-btn--loading" : ""}`}
                type="button"
                onClick={handlePayment}
                disabled={isSubmitting || paymentStatus === "pending_verification" || Boolean(resumeOrderId && !pendingOrder)}
              >
                {isSubmitting && (
                  <span className="payment-btn-spinner" aria-hidden="true" />
                )}
                {getButtonLabel()}
              </button>

              <p className="payment-btn-note">
                {isCod
                  ? "Your 10% advance is collected securely through Razorpay."
                  : "Your payment details are encrypted and securely processed."}
              </p>
            </div>
          </div>
        </main>

        {/* ── Summary Sidebar ── */}
        <aside className="payment-summary-sidebar" aria-label="Payment summary">
          <div className="payment-summary-card">
            <h2 className="payment-summary-title">Payable Summary</h2>

            <div className="payable-amount-box">
              <span className="payable-amount-label">
                {isCod ? "Advance to Pay Now" : "Amount to Pay"}
              </span>
              <strong className="payable-amount-val">
                ₹{amountToPay.toFixed(2)}
              </strong>
            </div>

            <div className="payment-mode-indicator">
              <span className="mode-indicator-label">Selected Mode:</span>
              <strong className="mode-indicator-value">
                {isCod ? "Cash on Delivery" : "Pay Online"}
              </strong>
            </div>

            <div className="payment-summary-breakdown">
              <div className="breakdown-row">
                <span>Order Total</span>
                <strong>₹{checkoutTotal.toFixed(2)}</strong>
              </div>

              {isCod ? (
                <>
                  <div className="breakdown-row breakdown-row--advance">
                    <span>Pay 10% online advance</span>
                    <strong>₹{codAdvance.toFixed(2)}</strong>
                  </div>
                  <div className="breakdown-row">
                    <span>Pay 90% on delivery</span>
                    <strong>₹{codRemaining.toFixed(2)}</strong>
                  </div>
                </>
              ) : (
                <div className="breakdown-row breakdown-row--advance">
                  <span>Pay 100% online now</span>
                  <strong>₹{checkoutTotal.toFixed(2)}</strong>
                </div>
              )}
            </div>

            {/* Coupon Box */}
            <div className="payment-coupon-section">
              <label htmlFor="payment-coupon-input" className="payment-coupon-label">
                Have a coupon?
              </label>
              <div className="payment-coupon-input-group">
                <input
                  id="payment-coupon-input"
                  type="text"
                  placeholder="Enter coupon code"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  disabled={isSubmitting || Boolean(pendingOrder)}
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={isSubmitting || Boolean(pendingOrder) || !coupon.trim()}
                >
                  Apply
                </button>
              </div>
              {discount > 0 && (
                <p className="payment-coupon-applied">
                  ✓ Coupon applied: ₹{discount.toFixed(2)} saved
                </p>
              )}
            </div>

            <div className="payment-guarantee-note">
              <img src={logo} alt="Haroon Stores" className="payment-trust-logo" />
              <span>Haroon Stores · Secure Checkout</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Payment;

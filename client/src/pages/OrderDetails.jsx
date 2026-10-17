import "./OrderDetails.css";

import {
  PRODUCT_PLACEHOLDER,
  getPrimaryImage,
  handleImageFallback
} from "../utils/imageFallback";

import {
  useLocation,
  useNavigate,
  useParams
} from "react-router-dom";

import {
  useEffect,
  useState
} from "react";

import {
  getApiUrl
} from "../utils/api";

import {
  getVariantLabel
} from "../utils/productDisplay";

import toast from "react-hot-toast";

import {
  FaBoxOpen,
  FaCheck,
  FaCheckCircle,
  FaRupeeSign,
  FaTimesCircle,
  FaUndo,
  FaTruck
} from "react-icons/fa";

import {
  ORDER_TRACKING_STEPS,
  CANCELLED_TRACKING_STEPS,
  PAYMENT_PENDING_TRACKING_STEPS,
  PAYMENT_EXPIRED_TRACKING_STEPS,
  RETURN_TRACKING_STATUSES,
  RETURN_TRACKING_STEPS,
  normaliseStatus,
  formatOrderDate,
  getStatusClass,
  hasDeliveredStatus,
  getTrackingStage,
  getStepState
} from "../utils/orderTracking";

function paymentResumeMessage(expiresAt, now) {
  if (!expiresAt) return "Payment checkout is ready to continue.";

  const remaining = new Date(expiresAt).getTime() - now;
  if (remaining <= 0) return "Payment window is expiring…";

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `Complete payment within ${minutes}:${String(seconds).padStart(2, "0")}.`;
}

function OrderDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  const searchParams = new URLSearchParams(location.search);
  const targetOrderId =
    params.id ||
    searchParams.get("id") ||
    searchParams.get("order") ||
    location.state?.order?.id ||
    location.state?.order?.databaseId ||
    null;

  const initialOrder =
    location.state?.order &&
    (!targetOrderId ||
      String(location.state.order.id) === String(targetOrderId) ||
      String(location.state.order.databaseId) === String(targetOrderId))
      ? location.state.order
      : null;

  const [order, setOrder] = useState(initialOrder);
  const [isLoading, setIsLoading] = useState(!initialOrder && !!targetOrderId);
  const [errorMessage, setErrorMessage] = useState("");

  const [cancelReason, setCancelReason] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [returnImageFile, setReturnImageFile] = useState(null);
  const [returnImagePreview, setReturnImagePreview] = useState("");
  const [returnImageName, setReturnImageName] = useState("");
  const [returnFormOpen, setReturnFormOpen] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* GET UPDATED ORDER FROM BACKEND OR LOCATION STATE */
  useEffect(() => {
    if (!targetOrderId) {
      return;
    }

    let isMounted = true;

    const navOrder = location.state?.order;
    if (
      navOrder &&
      (String(navOrder.id) === String(targetOrderId) ||
        String(navOrder.databaseId) === String(targetOrderId))
    ) {
      setOrder(navOrder);
      setErrorMessage("");
    } else if (
      !order ||
      (String(order.id) !== String(targetOrderId) &&
        String(order.databaseId) !== String(targetOrderId))
    ) {
      setIsLoading(true);
    }

    async function loadOrder() {
      try {
        const response = await fetch(
          getApiUrl(`/api/orders/${encodeURIComponent(targetOrderId)}`),
          {
            credentials: "include",
            cache: "no-store"
          }
        );

        const data = await response.json();

        if (!isMounted) return;

        if (response.ok && data.success && data.order) {
          setOrder(data.order);
          setErrorMessage("");
        } else if (!navOrder) {
          setErrorMessage(data.message || "Order not found");
        }
      } catch {
        if (!isMounted) return;
        if (!navOrder) {
          setErrorMessage("Unable to load order details.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      isMounted = false;
    };
  }, [targetOrderId, location.key]);

  /* LOADING STATE */
  if (isLoading) {
    return (
      <div className="order-details-page">
        <p style={{ textAlign: "center", padding: "40px", color: "#6d5b50" }}>
          Loading order details…
        </p>
      </div>
    );
  }

  /* NO ORDER */
  if (!order) {
    return (
      <div className="order-details-page">
        <h2>{errorMessage || "No Order Found"}</h2>
        <button onClick={() => navigate("/orders")}>Back to Orders</button>
      </div>
    );
  }

  const status = normaliseStatus(order.status);
  const isReturnTrackingStatus = RETURN_TRACKING_STATUSES.includes(status);
  const trackingStage = getTrackingStage(status);

  const returnTrackingStage = (() => {
    if (status === "refund completed") return 3;

    if (status === "return completed") {
      return normaliseStatus(order.refundStatus) === "refund processing"
        ? 3
        : 2;
    }

    if (["pickup scheduled", "pickup completed"].includes(status)) return 1;

    return 0;
  })();

  const statusSummary = (() => {
    if (status === "payment pending") {
      const amount = order.paymentMode === "COD"
        ? `Pay ₹${Number(order.codAdvance || 0).toFixed(2)} advance now; ₹${Number(order.codRemainingOnDelivery || 0).toFixed(2)} remains due on delivery.`
        : `Pay ₹${Number(order.total || 0).toFixed(2)} to complete your order.`;

      return {
        title: "Payment Pending",
        message: `${amount} ${paymentResumeMessage(order.paymentResumeExpiresAt, now)}`,
        Icon: FaRupeeSign,
        className: "payment-pending"
      };
    }

    if (status === "payment expired") {
      return {
        title: "Payment Expired",
        message: "This pending payment expired and the reserved stock was released.",
        Icon: FaTimesCircle,
        className: "payment-expired"
      };
    }

    if (status === "cancellation requested") {
      return {
        title: "Cancellation Requested",
        message: "Your cancellation request is being reviewed.",
        Icon: FaTimesCircle,
        className: "cancellation"
      };
    }

    if (status === "cancelled") {
      return {
        title: "Cancelled",
        message: "Your order has been cancelled.",
        Icon: FaTimesCircle,
        className: "cancellation"
      };
    }

    if ([
      "return requested",
      "pickup scheduled",
      "pickup completed",
      "return completed",
      "refund completed"
    ].includes(status)) {
      const returnSummary = {
        "return requested": [
          "Return Requested",
          "Your return request is under review."
        ],
        "pickup scheduled": [
          "Pickup Scheduled",
          "A return pickup has been scheduled."
        ],
        "pickup completed": [
          "Product Picked Up",
          "Your return pickup has been completed."
        ],
        "return completed": [
          "Return Completed",
          "Your return has been completed."
        ],
        "refund completed": [
          "Refund Completed",
          "Your refund has been completed."
        ]
      }[status] || ["Return Update", "There is an update to your return request."];

      return {
        title: returnSummary[0],
        message: returnSummary[1],
        Icon: FaUndo,
        className: "return"
      };
    }

    if (status === "shipped") {
      return {
        title: "Shipped",
        message: "Your order is on the way.",
        Icon: FaTruck,
        className: "shipped"
      };
    }

    if (hasDeliveredStatus(status)) {
      return {
        title: "Delivered",
        message: "Your order was delivered successfully.",
        Icon: FaCheckCircle,
        className: "delivered"
      };
    }

    return {
      title: "Processing",
      message: "Your order has been confirmed and is being prepared.",
      Icon: FaBoxOpen,
      className: "processing"
    };
  })();

  const canCancel = ["processing", "shipped"].includes(status);

  const canReturn = (() => {
    if (status !== "delivered" || !order.deliveredDate) {
      return false;
    }

    const deliveredAt = new Date(order.deliveredDate).getTime();
    const returnWindowEndsAt = deliveredAt + (5 * 24 * 60 * 60 * 1000);

    return !Number.isNaN(deliveredAt) &&
      now >= deliveredAt &&
      now <= returnWindowEndsAt;
  })();

  async function requestCancellation() {
    if (!cancelReason.trim()) {
      toast.error("Please enter cancellation reason");
      return;
    }

    try {
      setIsUpdatingOrder(true);
      const response = await fetch(
        getApiUrl(`/api/orders/${order.id}/cancel-request`),
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: cancelReason.trim() })
        }
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to request cancellation");
      }

      setOrder(data.order);
      setCancelReason("");
      toast.success("Cancellation Requested");
    } catch (error) {
      toast.error(error.message || "Failed to request cancellation");
    } finally {
      setIsUpdatingOrder(false);
    }
  }

  function handleReturnImageUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      toast.error("Upload an image under 5MB");
      return;
    }

    const reader = new FileReader();

    reader.onload = (loadEvent) => {
      const image = new Image();
      image.src = loadEvent.target.result;

      image.onload = () => {
        const maxWidth = 600;
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(
          image,
          0,
          0,
          canvas.width,
          canvas.height
        );

        canvas.toBlob((blob) => {
          if (!blob) {
            toast.error("Unable to process image");
            return;
          }

          const compressedFile = new File(
            [blob],
            "return-evidence.jpg",
            { type: "image/jpeg" }
          );
          setReturnImageFile(compressedFile);
          setReturnImagePreview(URL.createObjectURL(blob));
          setReturnImageName(file.name);
        }, "image/jpeg", 0.5);
      };
    };

    reader.readAsDataURL(file);
  }

  async function requestReturn() {
    if (!returnReason.trim()) {
      toast.error("Please enter return reason");
      return;
    }

    if (!returnImageFile) {
      toast.error("Please upload product image");
      return;
    }

    try {
      setIsUpdatingOrder(true);
      const payload = new FormData();
      payload.append("reason", returnReason.trim());
      payload.append(
        "image",
        returnImageFile,
        returnImageFile.name || "return-evidence.jpg"
      );

      const response = await fetch(
        getApiUrl(`/api/orders/${order.id}/return-request`),
        {
          method: "PATCH",
          credentials: "include",
          body: payload
        }
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to request return");
      }

      setOrder(data.order);
      setReturnReason("");
      setReturnImageFile(null);
      setReturnImagePreview("");
      setReturnImageName("");
      setReturnFormOpen(false);
      toast.success("Return Requested Successfully");
    } catch (error) {
      toast.error(error.message || "Failed to request return");
    } finally {
      setIsUpdatingOrder(false);
    }
  }

  return (

    <div className="order-details-page">

      <div className="details-card">

        <h1>
          Order Details
        </h1>

        {/* ORDER INFO */}

        <div className="order-meta">

          <p>

            <strong>
              Order ID:
            </strong>

            <span className="order-id-value">
              {order.id}
            </span>

          </p>

          <p>

            <strong>
              Date:
            </strong>

            {formatOrderDate(order.date)}

          </p>

          {/* STATUS */}

          <p>

            <strong>
              Order Status:
            </strong>

            <span

              className={`details-status ${getStatusClass(
                order.status
              )}`}

            >

              {order.status || "Processing"}

            </span>

          </p>

          {/* PAYMENT */}

          <p>

            <strong>
              Payment Mode:
            </strong>

            <span className="payment-badge">

              {order.paymentMode || "N/A"}

            </span>

          </p>

          {/* DELIVERY */}

          {(status === "processing" ||
            status === "shipped") &&
            order.deliveryDate && (

            <p className="order-meta-delivery">

              <strong>
                Expected Delivery:
              </strong>

              <span className="delivery-date">

                {formatOrderDate(order.deliveryDate)}

              </span>

            </p>

          )}

          {hasDeliveredStatus(status) &&
            order.deliveredDate && (

            <p className="order-meta-delivered-on">

              <strong>
                Delivered On:
              </strong>

              <span className="delivery-date delivered-date">

                {formatOrderDate(order.deliveredDate)}

              </span>

            </p>

          )}

        </div>

        {/* STATUS TIMELINE */}

        <div className="details-timeline">

          <div className={`details-status-summary ${statusSummary.className}`}>
            <span className="details-status-summary-icon">
              <statusSummary.Icon />
            </span>
            <div>
              <h4>{statusSummary.title}</h4>
              <p>{statusSummary.message}</p>
            </div>
          </div>

          <div
            className={`details-order-tracking ${
              status === "cancelled" ? "cancelled-tracking" : ""
            }`}
            aria-label="Order tracking"
          >
            {(status === "cancelled"
              ? CANCELLED_TRACKING_STEPS
              : status === "payment pending"
                ? PAYMENT_PENDING_TRACKING_STEPS
              : status === "payment expired"
                ? PAYMENT_EXPIRED_TRACKING_STEPS
              : ORDER_TRACKING_STEPS
            ).map(({ label, Icon, key }, index, steps) => {
              const stepKey = key || label.toLowerCase().replace(/\s+/g, "-");
              const { isComplete, isCurrent, isDelivered, isPending } = getStepState(
                index,
                trackingStage,
                order.status
              );

              return (
                <div className="details-order-tracking-segment" key={label}>
                  <div
                    className={`details-order-tracking-step step-${stepKey} ${
                      isComplete ? "complete" : ""
                    } ${isCurrent ? "current" : ""} ${
                      isDelivered ? "delivered" : ""
                    } ${isPending ? "pending" : ""}`}
                  >
                    <span className="details-order-tracking-icon">
                      {isComplete ? <FaCheck /> : <Icon />}
                    </span>
                    <span>{label}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <span
                      className={`details-order-tracking-line ${
                        index < (hasDeliveredStatus(order.status) ? 3 : trackingStage) ? "complete" : ""
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {isReturnTrackingStatus && (
          <section className="details-return-tracking" aria-label="Return tracking">
            <h3>Return Tracking</h3>

            <div className="details-return-tracking-timeline">
              {RETURN_TRACKING_STEPS.map(({ label, Icon, key }, index) => {
                const isComplete = index < returnTrackingStage;
                const isCurrent = index === returnTrackingStage;
                const isRefundProcessing = key === "refunded" &&
                  isCurrent && status !== "refund completed";
                const meta = key === "pickedUp" && status === "pickup scheduled" && order.pickupDate
                  ? `Pickup scheduled for ${formatOrderDate(order.pickupDate)}`
                  : key === "completed" && order.returnCompletedDate && index <= returnTrackingStage
                    ? formatOrderDate(order.returnCompletedDate)
                    : key === "refunded" && status === "refund completed" && order.refundCompletedDate
                      ? formatOrderDate(order.refundCompletedDate)
                      : key === "refunded" && isRefundProcessing && order.refundDate
                        ? `Expected by ${formatOrderDate(order.refundDate)}`
                        : "";

                return (
                  <div className="details-return-tracking-segment" key={key}>
                    <div
                      className={`details-return-tracking-step ${key} ${
                        isComplete ? "complete" : ""
                      } ${isCurrent ? "current" : ""} ${
                        status === "refund completed" && key === "refunded"
                          ? "refund-completed"
                          : ""
                      }`}
                    >
                      <span className="details-return-tracking-icon">
                        {isComplete ? <FaCheck /> : <Icon />}
                      </span>
                      <span className="details-return-tracking-label">
                        {isRefundProcessing ? "Refund Processing" : label}
                      </span>
                      {meta && (
                        <small className="details-return-tracking-meta">
                          {meta}
                        </small>
                      )}
                    </div>
                    {index < RETURN_TRACKING_STEPS.length - 1 && (
                      <span
                        className={`details-return-tracking-line ${
                          index < returnTrackingStage ? "complete" : ""
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <hr />

        {/* ITEMS */}

        <div className="details-items">

          {order.items.map(item => (

            <div
              key={item.id}
              className="details-item"
            >

              <div className="details-item-image">
                <img
                  src={getPrimaryImage(item) || PRODUCT_PLACEHOLDER}
                  alt={item.name}
                  loading="lazy"
                  onError={handleImageFallback}
                />
              </div>

              <div className="item-info">

                <h4>
                  {item.name}
                </h4>

                <p className="item-qty">

                  Qty:
                  {item.quantity}

                </p>

                <p className="item-price">

                  Rs. {item.price}

                </p>

                {getVariantLabel(item) && (
                  <p className="item-variant">
                    {getVariantLabel(item)}
                  </p>
                )}

              </div>

            </div>

          ))}

        </div>

        {/* PAYMENT */}

        <div className="details-payment" aria-label="Payment summary">
          <div className="details-payment-row details-payment-total-row">
            <span className="payment-label">Total Amount</span>
            <span className="details-total">Rs. {order.total}</span>
          </div>

          <div className="details-payment-row">
            <span className="payment-label">Paid</span>
            <span className="details-paid">Rs. {order.paid}</span>
          </div>

          {order.paymentMode === "COD" && (
            <div className="details-payment-row">
              <span className="payment-label">Required Online Advance (10%)</span>
              <span className="details-paid">Rs. {order.codAdvance}</span>
            </div>
          )}

          {order.paymentMode === "COD" && (
            <div className="details-payment-row details-payment-remaining-row">
              <span className="payment-label">Remaining on Delivery</span>
              <span className="details-remaining">
                Rs. {order.codRemainingOnDelivery ?? order.remaining}
              </span>
            </div>
          )}
        </div>

        {(status === "payment pending" || canCancel || canReturn) && (
          <section className="details-actions" aria-label="Order actions">
            {status === "payment pending" &&
              order.paymentAttemptState === "resume_window" &&
              order.paymentResumeExpiresAt &&
              new Date(order.paymentResumeExpiresAt).getTime() > now && (
              <div className="details-action-box">
                <h3>Complete Payment</h3>
                <p className="details-action-description">
                  Continue securely with Razorpay to confirm this order.
                </p>
                <button
                  type="button"
                  className="details-complete-payment-btn"
                  onClick={() => navigate(`/payment?order=${encodeURIComponent(order.id)}`)}
                >
                  Complete Payment
                </button>
              </div>
            )}
            {canCancel && (
              <div className="details-action-box">
                <h3>Cancel Order</h3>
                <p className="details-action-description">
                  Please tell us why you want to cancel this order.
                </p>
                <textarea
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="Reason for cancellation..."
                  disabled={isUpdatingOrder}
                />
                <button
                  type="button"
                  className="details-cancel-btn"
                  onClick={requestCancellation}
                  disabled={isUpdatingOrder}
                >
                  Request Cancellation
                </button>
              </div>
            )}

            {canReturn && (
              <div className="details-action-box">
                <button
                  type="button"
                  className="details-return-toggle"
                  onClick={() => setReturnFormOpen(!returnFormOpen)}
                  disabled={isUpdatingOrder}
                >
                  {returnFormOpen ? "Close Return Form" : "Request Return"}
                </button>

                {returnFormOpen && (
                  <div className="details-return-form">
                    <h3>Request Return</h3>
                    <p className="details-action-description">
                      Tell us why you want to return this item.
                    </p>
                    <textarea
                      value={returnReason}
                      onChange={(event) => setReturnReason(event.target.value)}
                      placeholder="Reason for return/refund..."
                      disabled={isUpdatingOrder}
                    />
                    <label className="details-return-upload">
                      <span className="details-return-upload-title">
                        Add return evidence
                      </span>
                      <small>JPG, PNG or WebP · Max 5MB</small>
                      <span className="details-return-upload-button">
                        Choose Image
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReturnImageUpload}
                        disabled={isUpdatingOrder}
                      />
                    </label>
                    {returnImagePreview && (
                      <div className="details-return-preview-row">
                        <img
                          className="details-return-preview"
                          src={returnImagePreview}
                          alt="Return evidence preview"
                        />
                        <span>{returnImageName || "Evidence image selected"}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      className="details-return-btn"
                      onClick={requestReturn}
                      disabled={isUpdatingOrder}
                    >
                      Request Return
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* FOOTER */}

        <div className="details-footer">

          <button

            className="back-btn"

            onClick={() =>
              navigate("/orders")
            }

          >

            Back to Orders

          </button>

        </div>

      </div>

    </div>

  );

}

export default OrderDetails;

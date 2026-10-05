import "./OrderDetails.css";

import {
  PRODUCT_PLACEHOLDER,
  getPrimaryImage,
  handleImageFallback
} from "../utils/imageFallback";

import {
  useLocation,
  useNavigate
}
from "react-router-dom";

import {
  useEffect,
  useState
}
from "react";

import {
  getApiUrl
}
from "../utils/api";

import {
  getVariantLabel
} from "../utils/productDisplay";

import toast from "react-hot-toast";

import {
  FaBoxOpen,
  FaCheck,
  FaCheckCircle,
  FaTimesCircle,
  FaUndo,
  FaTruck
} from "react-icons/fa";

const ORDER_TRACKING_STEPS = [
  { label: "Order Placed", Icon: FaBoxOpen },
  { label: "Processing", Icon: FaBoxOpen },
  { label: "Shipped", Icon: FaTruck },
  { label: "Delivered", Icon: FaCheckCircle }
];

function formatOrderDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function OrderDetails() {

  const location =
    useLocation();

  const navigate =
    useNavigate();

  const [order, setOrder] =
    useState(
      location.state?.order || null
    );

  const [cancelReason, setCancelReason] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [returnImageFile, setReturnImageFile] = useState(null);
  const [returnImagePreview, setReturnImagePreview] = useState("");
  const [returnImageName, setReturnImageName] = useState("");
  const [returnFormOpen, setReturnFormOpen] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  const orderId =
    order?.id;

  /* GET UPDATED ORDER */

  useEffect(() => {

    if (!orderId)
      return;

    async function loadOrder() {

      try {

        const response =
          await fetch(
            getApiUrl(`/api/orders/${orderId}`),
            {
              credentials: "include",
              cache: "no-store"
            }
          );

        const data =
          await response.json();

        if (response.ok && data.success) {
          setOrder(data.order);
        }

      } catch {

      }

    }

    loadOrder();

  }, [orderId]);

  /* NO ORDER */

  if (!order) {

    return (

      <div className="order-details-page">

        <h2>
          No Order Found
        </h2>

        <button
          onClick={() =>
            navigate("/orders")
          }
        >
          Back to Orders
        </button>

      </div>

    );

  }

  /* STATUS CLASS */

  function getStatusClass(status) {

    if (!status)
      return "processing";

    return status
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-");

  }

  function normaliseStatus(status) {

    return (status || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");

  }

  const status =
    normaliseStatus(order.status);

  const hasDeliveredStatus = [

    "delivered",
    "return requested",
    "pickup scheduled",
    "pickup completed",
    "return completed",
    "refund completed"

  ].includes(status);

  const trackingStage = (() => {
    if (status === "shipped") return 2;

    if (hasDeliveredStatus) return 3;

    if (["processing", "cancellation requested"].includes(status)) {
      return 1;
    }

    return 0;
  })();

  const statusSummary = (() => {
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
      return {
        title: order.status || "Return Update",
        message: "There is an update to your return request.",
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

    if (hasDeliveredStatus) {
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
      Date.now() >= deliveredAt &&
      Date.now() <= returnWindowEndsAt;
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

            {order.id}

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

            <p>

              <strong>
                Expected Delivery:
              </strong>

              <span className="delivery-date">

                {formatOrderDate(order.deliveryDate)}

              </span>

            </p>

          )}

          {hasDeliveredStatus &&
            order.deliveredDate && (

            <p>

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

          <div className="details-order-tracking" aria-label="Order tracking">
            {ORDER_TRACKING_STEPS.map(({ label, Icon }, index) => {
              const isComplete = index < trackingStage;
              const isCurrent = index === trackingStage;
              const isDelivered = index === 3 && trackingStage === 3;

              return (
                <div className="details-order-tracking-segment" key={label}>
                  <div
                    className={`details-order-tracking-step ${
                      isComplete ? "complete" : ""
                    } ${isCurrent ? "current" : ""} ${
                      isDelivered ? "delivered" : ""
                    }`}
                  >
                    <span className="details-order-tracking-icon">
                      {isComplete ? <FaCheck /> : <Icon />}
                    </span>
                    <span>{label}</span>
                  </div>
                  {index < ORDER_TRACKING_STEPS.length - 1 && (
                    <span
                      className={`details-order-tracking-line ${
                        index < trackingStage ? "complete" : ""
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {hasDeliveredStatus && order.deliveredDate && (
            <p className="details-delivered-date">
              Delivered on {formatOrderDate(order.deliveredDate)}
            </p>
          )}

          {status === "processing" && (

            <div className="details-timeline-card processing-card">

              <div className="details-timeline-left">
                BOX
              </div>

              <div>

                <h4>
                  Order Processing
                </h4>

                <p>
                  Your order has been confirmed and is being prepared.
                </p>

              </div>

            </div>

          )}

          {status === "shipped" && (

            <div className="details-timeline-card shipping-card">

              <div className="details-timeline-left">
                TRK
              </div>

              <div>

                <h4>
                  Order Shipped
                </h4>

                <p>
                  Your order is on the way.
                </p>

              </div>

            </div>

          )}

          {hasDeliveredStatus &&
            order.deliveredDate && (

            <div className="details-timeline-card delivered-card">

              <div className="details-timeline-left">
                OK
              </div>

              <div>

                <h4>
                  Delivered Successfully
                </h4>

                <p>
                  Your order was delivered on
                  <strong>
                    {formatOrderDate(order.deliveredDate)}
                  </strong>
                </p>

              </div>

            </div>

          )}

          {status === "return requested" && (

            <div className="details-timeline-card return-card">

              <div className="details-timeline-left">
                RTN
              </div>

              <div>

                <h4>
                  Return Requested
                </h4>

                <p>
                  Your return request is under review.
                </p>

              </div>

            </div>

          )}

          {status === "pickup scheduled" && (

            <div className="details-timeline-card pickup-card">

              <div className="details-timeline-left">
                PK
              </div>

              <div>

                <h4>
                  Pickup Scheduled
                </h4>

                <p>
                  Pickup arranged for
                  <strong>
                    {order.pickupDate}
                  </strong>
                </p>

              </div>

            </div>

          )}

          {(status === "pickup completed" ||
            status === "return completed" ||
            status === "refund completed") && (

            <div className="details-timeline-card pickup-complete-card">

              <div className="details-timeline-left">
                PK
              </div>

              <div>

                <h4>
                  Product Picked Up
                </h4>

                <p>
                  Return pickup completed successfully.
                </p>

              </div>

            </div>

          )}

          {(status === "return completed" ||
            status === "refund completed") &&
            order.returnCompletedDate && (

            <div className="details-timeline-card return-complete-card">

              <div className="details-timeline-left">
                OK
              </div>

              <div>

                <h4>
                  Return Completed
                </h4>

                <p>
                  Your return was completed on
                  <strong>
                    {formatOrderDate(order.returnCompletedDate)}
                  </strong>
                </p>

              </div>

            </div>

          )}

          {(status === "pickup completed" ||
            status === "return completed") &&
            order.refundDate && (

            <div className="details-timeline-card refund-card">

              <div className="details-timeline-left">
                Rs
              </div>

              <div>

                <h4>
                  Refund Processing
                </h4>

                <p>
                  Expected refund by
                  <strong>
                    {formatOrderDate(order.refundDate)}
                  </strong>
                </p>

              </div>

            </div>

          )}

          {status === "refund completed" &&
            order.refundCompletedDate && (

            <div className="details-timeline-card success-card">

              <div className="details-timeline-left">
                OK
              </div>

              <div>

                <h4>
                  Refund Completed Successfully
                </h4>

                <p>
                  Refund processed on
                  <strong>
                    {formatOrderDate(order.refundCompletedDate)}
                  </strong>
                </p>

              </div>

            </div>

          )}

        </div>

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

        <div className="details-payment">

          <p className="details-total">

            Total Amount:
            Rs. {order.total}

          </p>

          <p className="details-paid">

            Paid:
            Rs. {order.paid}

          </p>

          {order.paymentMode === "COD" && (

            <p className="details-paid">
              Required Online Advance (10%):
              Rs. {order.codAdvance}
            </p>

          )}

          {order.paymentMode === "COD" && (

            <p className="details-remaining">

              Remaining on Delivery:
              Rs. {order.codRemainingOnDelivery ?? order.remaining}

            </p>

          )}

        </div>

        {(canCancel || canReturn) && (
          <section className="details-actions" aria-label="Order actions">
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

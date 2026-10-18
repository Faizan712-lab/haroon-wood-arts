import "./Orders.css";

import {
  useEffect,
  useRef,
  useState
}
from "react";

import {
  useNavigate
}
from "react-router-dom";

import {
  getApiUrl
}
from "../utils/api";

import {
  PRODUCT_PLACEHOLDER,
  getPrimaryImage,
  handleImageFallback
}
from "../utils/imageFallback";

import {
  getVariantLabel
} from "../utils/productDisplay";

import {
  FaCheck
} from "react-icons/fa";

import {
  ORDER_TRACKING_STEPS,
  CANCELLED_TRACKING_STEPS,
  PAYMENT_PENDING_TRACKING_STEPS,
  REFUND_COMPLETED_TRACKING_STEPS,
  normaliseStatus,
  formatOrderDate,
  getStatusClass,
  getOrderStatusClass,
  getOrderStatusIcon,
  hasDeliveredStatus,
  getTrackingStage,
  getStepState
} from "../utils/orderTracking";

function paymentResumeLabel(expiresAt, now) {
  if (!expiresAt) return "Payment checkout is ready to continue.";

  const remaining = new Date(expiresAt).getTime() - now;
  if (remaining <= 0) return "Payment window is expiring…";

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `Complete payment within ${minutes}:${String(seconds).padStart(2, "0")}.`;
}

function Orders() {

  const [orders, setOrders] =
    useState([]);

  const [now, setNow] = useState(Date.now());

  const [cancelReason,
    setCancelReason] =
    useState({});

  const [returnReason,
    setReturnReason] =
    useState({});

  const [returnImage,
    setReturnImage] =
    useState({});

  const [returnImageFile,
    setReturnImageFile] =
    useState({});

  const [openReturnForms,
    setOpenReturnForms] =
    useState({});

  /* POPUP */

  const [showPopup,
    setShowPopup] =
    useState(false);

  const [popupMessage,
    setPopupMessage] =
    useState("");

  const navigate =
    useNavigate();

  const ordersRef =
    useRef([]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* ================= LOAD ================= */

  async function loadOrders() {

    try {

      const response =
        await fetch(
          getApiUrl("/api/users/me/orders"),
          {
            credentials: "include",
            cache: "no-store"
          }
        );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
          "Failed to load orders"
        );
      }

      setOrders(data.orders || []);

      ordersRef.current =
        data.orders || [];

    }

    catch {

      setOrders([]);

      ordersRef.current = [];

    }

  }

  useEffect(() => {

    loadOrders();

  }, []);

  useEffect(() => {

    ordersRef.current =
      orders;

  }, [orders]);

  /* ================= SAVE ================= */

  function updateOrderInState(updatedOrder) {

    const updatedOrders =
      ordersRef.current.map(order =>
        String(order.id) === String(updatedOrder.id)
          ? updatedOrder
          : order
      );

    setOrders(updatedOrders);

    ordersRef.current =
      updatedOrders;

  }

  async function patchOrder(
    orderId,
    path,
    body
  ) {

    const response =
      await fetch(
        getApiUrl(`/api/orders/${orderId}${path}`),
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json"
          },
          body:
            JSON.stringify(body || {})
        }
      );

    const data =
      await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
        "Failed to update order"
      );
    }

    updateOrderInState(data.order);

    return data.order;

  }

  /* ================= CANCEL ================= */

  function canCancel(order) {

    const status =
      normaliseStatus(
        order.status
      );

    return (

      status ===
        "processing" ||

      status ===
        "shipped"

    );

  }

  /* ================= RETURN ================= */

  function canReturn(order) {

    const status =
      normaliseStatus(
        order.status
      );

    if (
      status !== "delivered" ||
      !order.deliveredDate
    ) {

      return false;

    }

    const deliveredAt =
      new Date(order.deliveredDate)
        .getTime();

    if (Number.isNaN(deliveredAt)) {

      return false;

    }

    const returnWindowEndsAt =
      deliveredAt +
      (5 * 24 * 60 * 60 * 1000);

    const currentBrowserTime =
      Date.now();

    return (
      currentBrowserTime >= deliveredAt &&
      currentBrowserTime <= returnWindowEndsAt
    );

  }

  /* ================= IMAGE ================= */

  function handleImageUpload(
    e,
    orderId
  ) {

    const file =
      e.target.files[0];

    if (!file)
      return;

    if (
      file.size >
      15 * 1024 * 1024
    ) {

      setPopupMessage(
        "Image too large. Use image under 15MB."
      );

      setShowPopup(true);

      setTimeout(() => {

        setShowPopup(false);

      }, 3000);

      return;

    }

    const key = String(orderId);

    setReturnImageFile(prev => ({
      ...prev,
      [key]: file
    }));
    setReturnImage(prev => ({
      ...prev,
      [key]: URL.createObjectURL(file)
    }));

    setPopupMessage("Image Uploaded Successfully");
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 2000);

  }

  /* ================= CANCEL ================= */

  async function requestCancellation(
    orderId
  ) {

    const reason =

      cancelReason[
        String(orderId)
      ];

    if (!reason?.trim()) {

      setPopupMessage(
        "Please enter cancellation reason"
      );

      setShowPopup(true);

      setTimeout(() => {

        setShowPopup(false);

      }, 2500);

      return;

    }

    try {

      await patchOrder(
        orderId,
        "/cancel-request",
        { reason }
      );

    } catch (error) {

      setPopupMessage(error.message);
      setShowPopup(true);

      setTimeout(() => {
        setShowPopup(false);
      }, 2500);

      return;

    }

    setPopupMessage(
      "Cancellation Requested"
    );

    setShowPopup(true);

    setTimeout(() => {

      setShowPopup(false);

    }, 2500);

  }

  /* ================= RETURN ================= */

  async function requestReturn(
    orderId
  ) {

    const reason =

      returnReason[
        String(orderId)
      ];

    const image =

      returnImageFile[
        String(orderId)
      ];

    if (!reason?.trim()) {

      setPopupMessage(
        "Please enter return reason"
      );

      setShowPopup(true);

      setTimeout(() => {

        setShowPopup(false);

      }, 2500);

      return;

    }

    if (!image) {

      setPopupMessage(
        "Please upload product image"
      );

      setShowPopup(true);

      setTimeout(() => {

        setShowPopup(false);

      }, 2500);

      return;

    }

    try {

      const payload = new FormData();
      payload.append("reason", reason);
      payload.append("image", image, image.name || "return-evidence.jpg");

      const response = await fetch(
        getApiUrl(`/api/orders/${orderId}/return-request`),
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

    } catch (error) {

      setPopupMessage(error.message);
      setShowPopup(true);

      setTimeout(() => {
        setShowPopup(false);
      }, 2500);

      return;

    }

    setReturnReason(prev => ({

      ...prev,

      [String(orderId)]:
        ""

    }));

    setReturnImage(prev => ({

      ...prev,

      [String(orderId)]:
        ""

    }));

    setPopupMessage(
      "Return Requested Successfully"
    );

    setShowPopup(true);

    setTimeout(() => {

      setShowPopup(false);

    }, 2500);

  }

  return (

    <div className="orders-page">

      <h1>
        Your Orders
      </h1>

      {orders.length === 0 ? (

        <div className="empty-orders">

          <h2>
            No Orders Yet
          </h2>

          <p>
            Start shopping to see your orders here.
          </p>

        </div>

      ) : (

        <div className="orders-list">

          {orders.filter(order => normaliseStatus(order.status) !== "payment expired").map(order => (

            <div
              key={String(order.id)}
              className="order-card"
            >

              <div className="order-header">
                <div className="order-main-info">
                  <h3>Order ID: <span>{order.id}</span></h3>
                  <p className="order-date">Ordered on {formatOrderDate(order.date)}</p>
                </div>
                <div className="order-header-right">
                  {(() => {
                    const StatusIcon = getOrderStatusIcon(order.status);

                    return (
                  <div className={`user-order-status ${getStatusClass(order.status)}`}>
                    <StatusIcon aria-hidden="true" />
                    {order.status || "Processing"}
                  </div>
                    );
                  })()}
                </div>
              </div>

              <div className="order-items">
                {order.items.map(item => (
                  <div key={String(item.id)} className="order-item">
                    <div className="order-item-image">
                      <img
                        src={getPrimaryImage(item) || PRODUCT_PLACEHOLDER}
                        alt={item.name}
                        loading="lazy"
                        onError={handleImageFallback}
                      />
                    </div>
                    <div className="order-item-details">
                      <p className="order-item-name">{item.name}</p>
                      <div className="order-item-meta">
                        <span>Qty: {item.quantity}</span>
                        {getVariantLabel(item) && (
                          <span> | {getVariantLabel(item)}</span>
                        )}
                      </div>
                      <span className="order-item-price">
                        Rs. {item.price * item.quantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div
                className={`order-tracking ${
                  normaliseStatus(order.status) === "cancelled"
                    ? "cancelled-tracking"
                    : normaliseStatus(order.status) === "refund completed"
                      ? "refund-completed-tracking"
                      : ""
                }`}
                aria-label="Order tracking"
              >
                {(normaliseStatus(order.status) === "cancelled"
                  ? CANCELLED_TRACKING_STEPS
                  : normaliseStatus(order.status) === "payment pending"
                    ? PAYMENT_PENDING_TRACKING_STEPS
                  : normaliseStatus(order.status) === "refund completed"
                    ? REFUND_COMPLETED_TRACKING_STEPS
                    : ORDER_TRACKING_STEPS
                ).map(({ label, Icon, key }, index, steps) => {
                  const stepKey = key || label.toLowerCase().replace(/\s+/g, "-");
                  const currentStage = getTrackingStage(order.status);
                  const { isComplete, isCurrent, isDelivered, isPending } = getStepState(
                    index,
                    currentStage,
                    order.status
                  );

                  return (
                    <div className="order-tracking-segment" key={label}>
                      <div
                        className={`order-tracking-step step-${stepKey} ${
                          isComplete ? "complete" : ""
                        } ${isCurrent ? "current" : ""} ${
                          isDelivered ? "delivered" : ""
                        } ${isPending ? "pending" : ""}`}
                      >
                        <span className="order-tracking-icon">
                          {isComplete ? <FaCheck /> : <Icon />}
                        </span>
                        <span className="order-tracking-label">{label}</span>
                      </div>
                      {index < steps.length - 1 && (
                        <span
                          className={`order-tracking-line ${
                            index < (hasDeliveredStatus(order.status) ? 3 : currentStage) ? "complete" : ""
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {hasDeliveredStatus(order.status) && order.deliveredDate && (
                <p className="order-delivered-date">
                  Delivered on {formatOrderDate(order.deliveredDate)}
                </p>
              )}

              {order.returnImage && (
                <div className="order-return-proof-row" style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <a
                    href={order.returnImageOriginal || order.returnImage}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Click to view full uncompressed return evidence"
                  >
                    <img
                      src={order.returnImage}
                      alt="Return proof"
                      style={{ width: "42px", height: "42px", objectFit: "cover", borderRadius: "6px", border: "1px solid #d8cfc4" }}
                    />
                  </a>
                  <div style={{ fontSize: "12px", color: "#5d4037" }}>
                    <span style={{ fontWeight: 600, display: "block" }}>Return proof submitted</span>
                    {order.returnImageOriginal && order.returnImageOriginal !== order.returnImage && (
                      <a
                        href={order.returnImageOriginal}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#8a5836", textDecoration: "underline" }}
                      >
                        View Full Original
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="order-card-footer">
                <div className="order-total-compact">
                  Total: <strong>Rs. {order.total}</strong>
                </div>
                {normaliseStatus(order.status) === "payment pending" &&
                  order.paymentAttemptState === "resume_window" &&
                  order.paymentResumeExpiresAt &&
                  new Date(order.paymentResumeExpiresAt).getTime() > now && (
                  <div className="pending-payment-action">
                    <p>{paymentResumeLabel(order.paymentResumeExpiresAt, now)}</p>
                    <button
                      className="complete-payment-btn"
                      onClick={() => navigate(`/payment?order=${encodeURIComponent(order.id)}`)}
                    >
                      Complete Payment
                    </button>
                  </div>
                )}
                <button
                  className="view-order-btn"
                  onClick={() => navigate(`/order-details?id=${encodeURIComponent(order.id)}`, { state: { order } })}
                >
                  View Details →
                </button>
              </div>

            </div>

          ))}

        </div>

      )}

      {/* POPUP */}

      {showPopup && (

        <div className="custom-popup">

          {popupMessage}

        </div>

      )}

    </div>

  );

}

export default Orders;

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
  FaBoxOpen,
  FaCheck,
  FaCheckCircle,
  FaRupeeSign,
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

const CANCELLED_TRACKING_STEPS = [
  { label: "Order Placed", Icon: FaBoxOpen },
  { label: "Cancelled", Icon: FaTimesCircle }
];

const REFUND_COMPLETED_TRACKING_STEPS = [
  ...ORDER_TRACKING_STEPS,
  { label: "Refund Completed", Icon: FaRupeeSign }
];

function getTrackingStage(status) {
  const normalisedStatus = (status || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

  if (normalisedStatus === "cancelled") return 1;

  if (normalisedStatus === "shipped") return 2;

  if (normalisedStatus === "refund completed") return 4;

  if ([
    "delivered",
    "return requested",
    "pickup scheduled",
    "pickup completed",
    "return completed",
    "refund completed"
  ].includes(normalisedStatus)) return 3;

  if (["processing", "cancellation requested"].includes(normalisedStatus)) {
    return 1;
  }

  return 0;
}

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

function getOrderStatusIcon(status) {
  const normalisedStatus = (status || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

  if (["cancelled", "cancellation requested"].includes(normalisedStatus)) {
    return FaTimesCircle;
  }

  if (normalisedStatus.includes("return") || normalisedStatus.includes("pickup")) {
    return FaUndo;
  }

  if (normalisedStatus === "delivered") return FaCheckCircle;
  if (normalisedStatus === "shipped") return FaTruck;

  return FaBoxOpen;
}

function Orders() {

  const [orders, setOrders] =
    useState([]);

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

  /* ================= STATUS ================= */

  function getStatusClass(status) {

    if (!status)
      return "processing";

    return status

      .toLowerCase()

      .trim()

      .replaceAll(" ", "-");

  }

  function normaliseStatus(status) {

    return (status || "")

      .toLowerCase()

      .trim()

      .replace(/\s+/g, " ");

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
      5 * 1024 * 1024
    ) {

      setPopupMessage(
        "Image too large. Use image under 5MB."
      );

      setShowPopup(true);

      setTimeout(() => {

        setShowPopup(false);

      }, 3000);

      return;

    }

    const reader =
      new FileReader();

    reader.onload = (event) => {

      const img =
        new Image();

      img.src =
        event.target.result;

      img.onload = () => {

        const canvas =
          document.createElement(
            "canvas"
          );

        const ctx =
          canvas.getContext("2d");

        const MAX_WIDTH =
          600;

        const scale =
          MAX_WIDTH /
          img.width;

        canvas.width =
          MAX_WIDTH;

        canvas.height =
          img.height * scale;

        ctx.drawImage(

          img,

          0,

          0,

          canvas.width,

          canvas.height

        );

        canvas.toBlob((blob) => {
          if (!blob) {
            setPopupMessage("Unable to process image.");
            setShowPopup(true);
            return;
          }

          const key = String(orderId);
          const compressedFile = new File(
            [blob],
            "return-evidence.jpg",
            { type: "image/jpeg" }
          );

          setReturnImageFile(prev => ({
            ...prev,
            [key]: compressedFile
          }));
          setReturnImage(prev => ({
            ...prev,
            [key]: URL.createObjectURL(blob)
          }));

          setPopupMessage("Image Uploaded Successfully");
          setShowPopup(true);
          setTimeout(() => setShowPopup(false), 2000);
        }, "image/jpeg", 0.5);

      };

    };

    reader.readAsDataURL(file);

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
        📦 Your Orders
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

          {orders.map(order => (

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
                      <p>{item.name}</p>
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
                  : normaliseStatus(order.status) === "refund completed"
                    ? REFUND_COMPLETED_TRACKING_STEPS
                    : ORDER_TRACKING_STEPS
                ).map(({ label, Icon }, index, steps) => {
                  const currentStage = getTrackingStage(order.status);
                  const isComplete = index < currentStage;
                  const isCurrent = index === currentStage;
                  const isDelivered = index === 3 && currentStage === 3;

                  return (
                    <div className="order-tracking-segment" key={label}>
                      <div
                        className={`order-tracking-step ${
                          isComplete ? "complete" : ""
                        } ${isCurrent ? "current" : ""} ${
                          isDelivered ? "delivered" : ""
                        }`}
                      >
                        <span className="order-tracking-icon">
                          {isComplete ? <FaCheck /> : <Icon />}
                        </span>
                        <span className="order-tracking-label">{label}</span>
                      </div>
                      {index < steps.length - 1 && (
                        <span
                          className={`order-tracking-line ${
                            index < currentStage ? "complete" : ""
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {getTrackingStage(order.status) === 3 && order.deliveredDate && (
                <p className="order-delivered-date">
                  Delivered on {formatOrderDate(order.deliveredDate)}
                </p>
              )}

              <div className="order-card-footer">
                <div className="order-total-compact">
                  Total: <strong>₹ {order.total}</strong>
                </div>
                <button
                  className="view-order-btn"
                  onClick={() => navigate("/order-details", { state: { order } })}
                >
                  View Full Order →
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

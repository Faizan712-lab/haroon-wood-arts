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
  handleImageFallback
}
from "../utils/imageFallback";

import {
  getVariantLabel
} from "../utils/productDisplay";

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
      10 * 1024 * 1024
    ) {

      setPopupMessage(
        "Image too large. Use image under 10MB."
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

        const compressedImage =

          canvas.toDataURL(
            "image/jpeg",
            0.5
          );

        setReturnImage(prev => ({

          ...prev,

          [String(orderId)]:
            compressedImage

        }));

        setPopupMessage(
          "Image Uploaded Successfully"
        );

        setShowPopup(true);

        setTimeout(() => {

          setShowPopup(false);

        }, 2000);

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

      returnImage[
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

      await patchOrder(
        orderId,
        "/return-request",
        {
          reason,
          image
        }
      );

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

              <div className="order-card-layout">

                <section className="order-detail-column">

              {/* HEADER */}

              <div className="order-header">

                <div className="order-main-info">

                  <h3>

                    Order ID:

                    <span>
                      {order.id}
                    </span>

                  </h3>

                  <p className="order-date">

                    {order.date}

                  </p>

                  {/* STATUS */}

                  <div

                    className={`user-order-status ${getStatusClass(
                      order.status
                    )}`}

                  >

                    {order.status ||
                      "Processing"}

                  </div>

                  {/* ====================================== */}
{/* DELIVERY STATUS */}
{/* ====================================== */}

{(

  normaliseStatus(order.status) ===
    "processing" ||

  normaliseStatus(order.status) ===
    "shipped"

) && order.deliveryDate && (

  <div className="delivery-date">

    <span className="delivery-icon">
      📦
    </span>

    <span className="delivery-label">

      Expected Delivery By

    </span>

    <strong className="delivery-value">

      {order.deliveryDate}

    </strong>

  </div>

)}

{/* ====================================== */}
{/* DELIVERED DATE */}
{/* ====================================== */}

{(

  normaliseStatus(order.status) ===
    "delivered" ||

  normaliseStatus(order.status) ===
    "return requested" ||

  normaliseStatus(order.status) ===
    "pickup scheduled" ||

  normaliseStatus(order.status) ===
    "pickup completed" ||

  normaliseStatus(order.status) ===
    "return completed" ||

  normaliseStatus(order.status) ===
    "refund completed"

) && order.deliveredDate && (

  <div className="delivery-date delivered-date-box">

    <span className="delivery-icon">
      ✅
    </span>

    <span className="delivery-label">

      Delivered On

    </span>

    <strong className="delivery-value">

      {order.deliveredDate}

    </strong>

  </div>

)}

{/* ====================================== */}
{/* ORDER TIMELINE */}
{/* ====================================== */}

<div className="order-timeline">

  {/* PROCESSING */}

  {normaliseStatus(order.status) ===
    "processing" && (

    <div className="timeline-card processing-card">

      <div className="timeline-left">

        📦

      </div>

      <div className="timeline-content">

        <h4>
          Order Processing
        </h4>

        <p>

          Your order has been confirmed
          and is being prepared.

        </p>

      </div>

    </div>

  )}

  {/* SHIPPED */}

  {normaliseStatus(order.status) ===
    "shipped" && (

    <div className="timeline-card shipping-card">

      <div className="timeline-left">

        🚚

      </div>

      <div className="timeline-content">

        <h4>
          Order Shipped
        </h4>

        <p>

          Your order is on the way.

        </p>

      </div>

    </div>

  )}

  {/* DELIVERED */}

  {(

    normaliseStatus(order.status) ===
      "delivered" ||

    normaliseStatus(order.status) ===
      "return requested" ||

    normaliseStatus(order.status) ===
      "pickup scheduled" ||

    normaliseStatus(order.status) ===
      "pickup completed" ||

    normaliseStatus(order.status) ===
      "return completed" ||

    normaliseStatus(order.status) ===
      "refund completed"

  ) && order.deliveredDate && (

    <div className="timeline-card delivered-card">

      <div className="timeline-left">

        ✅

      </div>

      <div className="timeline-content">

        <h4>
          Delivered Successfully
        </h4>

        <p>

          Your order was delivered on

          <strong>

            {order.deliveredDate}

          </strong>

        </p>

      </div>

    </div>

  )}

  {/* RETURN REQUESTED */}

  {normaliseStatus(order.status) ===
    "return requested" && (

    <div className="timeline-card return-card">

      <div className="timeline-left">

        ↩️

      </div>

      <div className="timeline-content">

        <h4>
          Return Requested
        </h4>

        <p>

          Your return request is under review.

        </p>

      </div>

    </div>

  )}

  {/* PICKUP SCHEDULED */}

  {normaliseStatus(order.status) ===
    "pickup scheduled" && (

    <div className="timeline-card pickup-card">

      <div className="timeline-left">

        📦

      </div>

      <div className="timeline-content">

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

  {/* PICKUP COMPLETED */}

  {normaliseStatus(order.status) ===
    "pickup completed" && (

    <>

      <div className="timeline-card pickup-complete-card">

        <div className="timeline-left">

          📬

        </div>

        <div className="timeline-content">

          <h4>
            Product Picked Up
          </h4>

          <p>

            Your returned product has been collected.

          </p>

        </div>

      </div>

      {/* REFUND PROCESSING */}

      <div className="timeline-card refund-card">

        <div className="timeline-left">

          💰

        </div>

        <div className="timeline-content">

          <h4>
            Refund Processing
          </h4>

          <p>

            Expected refund by

            <strong>

              {order.refundDate}

            </strong>

          </p>

        </div>

      </div>

    </>

  )}

  {/* RETURN COMPLETED */}

  {normaliseStatus(order.status) ===
    "return completed" && (

    <>

      <div className="timeline-card pickup-complete-card">

        <div className="timeline-left">

          PK

        </div>

        <div className="timeline-content">

          <h4>
            Product Picked Up
          </h4>

          <p>

            Return pickup completed successfully.

          </p>

        </div>

      </div>

      <div className="timeline-card return-complete-card">

        <div className="timeline-left">

          OK

        </div>

        <div className="timeline-content">

          <h4>
            Return Completed
          </h4>

          <p>

            Your return was completed on

            <strong>

              {order.returnCompletedDate}

            </strong>

          </p>

        </div>

      </div>

      <div className="timeline-card refund-card">

        <div className="timeline-left">

          Rs

        </div>

        <div className="timeline-content">

          <h4>
            Refund Processing
          </h4>

          <p>

            Expected refund by

            <strong>

              {order.refundDate}

            </strong>

          </p>

        </div>

      </div>

    </>

  )}

  {/* REFUND COMPLETED */}

  {normaliseStatus(order.status) ===
    "refund completed" && (

    <>

      {/* PICKUP COMPLETE */}

      <div className="timeline-card pickup-complete-card">

        <div className="timeline-left">

          📬

        </div>

        <div className="timeline-content">

          <h4>
            Product Picked Up
          </h4>

          <p>

            Return pickup completed successfully.

          </p>

        </div>

      </div>

      {order.returnCompletedDate && (

        <div className="timeline-card return-complete-card">

          <div className="timeline-left">

            OK

          </div>

          <div className="timeline-content">

            <h4>
              Return Completed
            </h4>

            <p>

              Your return was completed on

              <strong>

                {order.returnCompletedDate}

              </strong>

            </p>

          </div>

        </div>

      )}

      {/* REFUND SUCCESS */}

      <div className="timeline-card success-card">

        <div className="timeline-left">

          🎉

        </div>

        <div className="timeline-content">

          <h4>
            Refund Completed Successfully
          </h4>

          <p>

            Refund processed on

            <strong>

              {order.refundCompletedDate}

            </strong>

          </p>

        </div>

      </div>

    </>

  )}

</div>
                  {/* TIMELINE */}

                  {![
                    "processing",
                    "shipped",
                    "delivered",
                    "return requested",
                    "pickup scheduled",
                    "pickup completed",
                    "return completed",
                    "refund completed"
                  ].includes(normaliseStatus(order.status)) && (
                  <div className="order-timeline">

                    {/* DELIVERED */}

                    {order.deliveredDate && (

                      <div className="timeline-card delivered-card">

                        <div className="timeline-left">

                          ✅

                        </div>

                        <div className="timeline-content">

                          <h4>
                            Delivered Successfully
                          </h4>

                          <p>

                            Your order was delivered on

                            <strong>

                              {order.deliveredDate}

                            </strong>

                          </p>

                        </div>

                      </div>

                    )}

                    {/* PICKUP */}

                    {order.pickupDate && (

                      <div className="timeline-card pickup-card">

                        <div className="timeline-left">

                          📦

                        </div>

                        <div className="timeline-content">

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

                    {/* REFUND PROCESS */}

                    {order.refundDate &&

                      order.status !==
                        "Refund Completed" && (

                      <div className="timeline-card refund-card">

                        <div className="timeline-left">

                          💰

                        </div>

                        <div className="timeline-content">

                          <h4>
                            Refund Processing
                          </h4>

                          <p>

                            Expected refund by

                            <strong>

                              {order.refundDate}

                            </strong>

                          </p>

                        </div>

                      </div>

                    )}

                    {/* REFUND COMPLETED */}

                    {order.refundCompletedDate && (

                      <div className="timeline-card success-card">

                        <div className="timeline-left">

                          🎉

                        </div>

                        <div className="timeline-content">

                          <h4>
                            Refund Completed
                          </h4>

                          <p>

                            Refund successfully processed on

                            <strong>

                              {order.refundCompletedDate}

                            </strong>

                          </p>

                        </div>

                      </div>

                    )}

                  </div>
                  )}

                </div>

                {/* TOTAL */}

                <div className="order-total">

                  ₹ {order.total}

                </div>

              </div>

              <hr />

              {/* ITEMS */}

              <div className="order-items">

                {order.items.map(item => (

                  <div

                    key={String(item.id)}

                    className="order-item"

                  >

                    <img

                      src={item.image || PRODUCT_PLACEHOLDER}

                      alt={item.name}

                      onError={handleImageFallback}

                    />

                    <div>

                      <p>
                        {item.name}
                      </p>

                      <span>

                        Qty:
                        {item.quantity}

                      </span>
                      {getVariantLabel(item) && (
                        <span>
                          {getVariantLabel(item)}
                        </span>
                      )}

                      <span className="order-item-price">

                        Rs. {item.price * item.quantity}

                      </span>

                    </div>

                  </div>

                ))}

              </div>

                </section>

                <aside className="order-summary-panel">

                  <h4>
                    Order Summary
                  </h4>

                  <div className="summary-amount">

                    <span>
                      Total Amount
                    </span>

                    <strong>
                      Rs. {order.total}
                    </strong>

                  </div>

                  <div className="summary-row">

                    <span>
                      Status
                    </span>

                    <strong>
                      {order.status || "Processing"}
                    </strong>

                  </div>

                  {(order.deliveryDate || order.deliveredDate) && (

                    <div className="summary-row">

                      <span>
                        Delivery Date
                      </span>

                      <strong>
                        {order.deliveredDate || order.deliveryDate}
                      </strong>

                    </div>

                  )}

                  <div className="summary-row">

                    <span>
                      Ordered On
                    </span>

                    <strong>
                      {order.date}
                    </strong>

                  </div>

              {/* ACTIONS */}

              <div className="order-actions">

                {/* CANCEL */}

                {canCancel(order) && (

                  <div className="cancel-box">

                    <textarea

                      placeholder="Reason for cancellation..."

                      value={
                        cancelReason[
                          String(order.id)
                        ] || ""
                      }

                      onChange={(e)=>

                        setCancelReason({

                          ...cancelReason,

                          [String(order.id)]:
                            e.target.value

                        })

                      }

                      className="cancel-reason"

                    />

                    <button

                      className="cancel-order-btn"

                      onClick={() =>
                        requestCancellation(
                          String(order.id)
                        )
                      }

                    >

                      Request Cancellation

                    </button>

                  </div>

                )}

                {/* RETURN */}

                {canReturn(order) && (

                  <div className="return-accordion">

                    <button
                      type="button"
                      className="return-toggle-btn"
                      onClick={() =>
                        setOpenReturnForms(prev => ({
                          ...prev,
                          [String(order.id)]:
                            !prev[String(order.id)]
                        }))
                      }
                    >

                      {openReturnForms[String(order.id)]
                        ? "Close Return Form"
                        : "Request Return"}

                    </button>

                    {openReturnForms[String(order.id)] && (

                    <div className="return-box">

                    <textarea

                      placeholder="Reason for return/refund..."

                      value={
                        returnReason[
                          String(order.id)
                        ] || ""
                      }

                      onChange={(e)=>

                        setReturnReason({

                          ...returnReason,

                          [String(order.id)]:
                            e.target.value

                        })

                      }

                      className="cancel-reason"

                    />

                    <input
                      id={`return-file-${String(order.id)}`}
                      type="file"

                      accept="image/*"

                      onChange={(e)=>

                        handleImageUpload(
                          e,
                          String(order.id)
                        )

                      }

                    />

                    <label
                      htmlFor={`return-file-${String(order.id)}`}
                      className="return-upload-btn"
                    >

                      Upload Product Image

                    </label>

                    {returnImage[
                      String(order.id)
                    ] && (

                      <img

                        src={
                          returnImage[
                            String(order.id)
                          ]
                        }

                        alt="Preview"

                        className="return-preview"

                      />

                    )}

                    <p className="return-note">

                      Refunds are usually processed within
                      3–5 business days after product inspection.

                    </p>

                    <button

                      className="return-order-btn"

                      onClick={() =>
                        requestReturn(
                          String(order.id)
                        )
                      }

                    >

                      Request Return

                    </button>

                  </div>

                    )}

                  </div>

                )}

                {/* VIEW */}

                <button

                  className="view-order-btn"

                  onClick={() =>

                    navigate(
                      "/order-details",
                      {
                        state: { order }
                      }
                    )

                  }

                >

                  View Full Order →

                </button>

              </div>

                </aside>

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

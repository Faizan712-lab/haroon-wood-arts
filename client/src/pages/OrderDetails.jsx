import "./OrderDetails.css";

import {
  PRODUCT_PLACEHOLDER,
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

function OrderDetails() {

  const location =
    useLocation();

  const navigate =
    useNavigate();

  const [order, setOrder] =
    useState(
      location.state?.order || null
    );

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

            {order.date}

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

                {order.deliveryDate}

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

                {order.deliveredDate}

              </span>

            </p>

          )}

        </div>

        {/* STATUS TIMELINE */}

        <div className="details-timeline">

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
                    {order.deliveredDate}
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
                    {order.returnCompletedDate}
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
                    {order.refundDate}
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
                    {order.refundCompletedDate}
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

              <img
                src={item.image || PRODUCT_PLACEHOLDER}
                alt={item.name}
                onError={handleImageFallback}
              />

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
            Rs. {order.paid || order.total}

          </p>

          {order.paymentMode === "COD" && (

            <p className="details-remaining">

              Remaining on Delivery:
              Rs. {order.remaining}

            </p>

          )}

        </div>

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

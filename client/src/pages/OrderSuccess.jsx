import "./OrderSuccess.css";

import {
  PRODUCT_PLACEHOLDER,
  handleImageFallback
} from "../utils/imageFallback";

import { useEffect, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import Confetti from "react-confetti";

function OrderSuccess() {

  const location = useLocation();
  const navigate = useNavigate();

  const order =
    location.state?.order;

  const [windowSize,
    setWindowSize] =
    useState({
      width: window.innerWidth,
      height: window.innerHeight
    });

  const [showConfetti,
    setShowConfetti] =
    useState(true);

  useEffect(() => {

    function handleResize() {

      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });

    }

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );
    };

  }, []);

  useEffect(() => {

    const timer =
      setTimeout(() => {
        setShowConfetti(false);
      }, 2600);

    return () =>
      clearTimeout(timer);

  }, []);

  if (!order) {

    return (
      <div className="success-page">
        <div className="success-card">
          <h2>No Order Found</h2>
          <button
            className="success-continue-btn"
            onClick={() =>
              navigate("/")
            }
          >
            Go Home
          </button>
        </div>
      </div>
    );

  }

  return (

    <div className="success-page">

      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          numberOfPieces={70}
          recycle={false}
          gravity={0.18}
          tweenDuration={700}
        />
      )}

      <div className="success-stepper">
        <div className="success-step done">
          <span>✓</span>
          <p>Address</p>
        </div>

        <div className="success-line active"></div>

        <div className="success-step done">
          <span>✓</span>
          <p>Payment</p>
        </div>

        <div className="success-line active"></div>

        <div className="success-step active">
          <span>✓</span>
          <p>Success</p>
        </div>
      </div>

      <div className="success-card">

        <div className="success-ring">
          <div className="checkmark">
            <span>✓</span>
          </div>
        </div>

        <h1>
          Order Placed
        </h1>

        <p className="success-subtitle">
          Your order has been confirmed successfully.
        </p>

        <div className="success-order-meta">
          <p>
            <strong>Order ID</strong>
            <span>{order.id}</span>
          </p>

          <p>
            <strong>Date</strong>
            <span>{order.date}</span>
          </p>

          <p>
            <strong>Payment</strong>
            <span className="payment-badge">
              {order.paymentMode ||
                "Online Payment"}
            </span>
          </p>

          {order.deliveryDate && (
            <p>
              <strong>Estimated Delivery</strong>
              <span>{order.deliveryDate}</span>
            </p>
          )}
        </div>

        <div className="success-divider"></div>

        <div className="success-products">
          {order.items.map(item => (
            <div
              key={item.id}
              className="success-item"
            >
              <img
                src={item.image || PRODUCT_PLACEHOLDER}
                alt={item.name}
                onError={handleImageFallback}
              />

              <div className="item-details">
                <p className="product-name">
                  {item.name}
                </p>
                <span className="product-qty">
                  Qty: {item.quantity}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="success-total">
          <p className="total-amount">
            <span>Total Amount</span>
            <strong>Rs. {order.total}</strong>
          </p>

          <p className="paid-amount">
            <span>Paid</span>
            <strong>Rs. {order.paid}</strong>
          </p>

          {order.paymentMode === "COD" && (
            <p className="remaining-amount">
              <span>Remaining on Delivery</span>
              <strong>Rs. {order.remaining}</strong>
            </p>
          )}
        </div>

        <button
          className="success-continue-btn"
          onClick={() =>
            navigate("/")
          }
        >
          Continue Shopping
        </button>

      </div>

    </div>

  );

}

export default OrderSuccess;

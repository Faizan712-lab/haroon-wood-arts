import "./Payment.css";

import {
  FaCreditCard,
  FaLock,
  FaShieldAlt,
  FaTruck
} from "react-icons/fa";

import {
  useContext,
  useState
} from "react";

import {
  useLocation,
  useNavigate
} from "react-router-dom";

import toast from "react-hot-toast";

import {
  CartContext
} from "../context/CartContext";

import {
  getApiUrl
} from "../utils/api";

const paymentLogos = {
  gpay:
    "https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg",
  paytm:
    "https://upload.wikimedia.org/wikipedia/commons/4/42/Paytm_logo.png",
  phonepe:
    "https://upload.wikimedia.org/wikipedia/commons/7/71/PhonePe_Logo.svg",
  visa:
    "https://upload.wikimedia.org/wikipedia/commons/5/5c/Visa_Inc._logo_%282021%E2%80%93present%29.svg",
  mastercard:
    "https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg"
};

const paymentOptions = [
  {
    id: "gpay",
    label: "Google Pay",
    type: "UPI",
    logo:
      paymentLogos.gpay
  },
  {
    id: "paytm",
    label: "Paytm",
    type: "Wallet / UPI",
    logo:
      paymentLogos.paytm
  },
  {
    id: "phonepe",
    label: "PhonePe",
    type: "UPI",
    logo:
      paymentLogos.phonepe
  },
  {
    id: "card",
    label: "Debit / Credit Card",
    type: "Visa, Mastercard",
    logo:
      paymentLogos.visa
  }
];

function Payment() {

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const {
    cartItems,
    clearCart,
    getTotalPrice
  } = useContext(CartContext);

  const params =

    new URLSearchParams(
      location.search
    );

  const amount =

    Number(
      params.get("amount")
    ) || 0;

  const paymentMode =

    params.get("mode") ||
    "Online";

  const isCod =
    paymentMode === "COD";

  const checkoutData =
    location.state?.checkoutData || {};

  const [selectedMethod,
    setSelectedMethod] =
    useState(
      isCod
        ? "cod"
        : "gpay"
    );

  const [cardDetails,
    setCardDetails] =
    useState({
      number: "",
      name: "",
      expiry: "",
      cvv: ""
    });

  const [isSubmitting,
    setIsSubmitting] =
    useState(false);

  function getDeliveryDate() {

    const date =
      new Date();

    date.setDate(
      date.getDate() + 4
    );

    return date.toDateString();

  }

  function handleCardChange(e) {

    const {
      name,
      value
    } = e.target;

    setCardDetails({
      ...cardDetails,
      [name]:
        value
    });

  }

  function getPaymentLabel() {

    if (selectedMethod === "cod") {
      return "COD";
    }

    const selected =
      paymentOptions.find(
        option =>
          option.id === selectedMethod
      );

    return selected?.label || "Online Payment";

  }

  function validatePayment() {

    if (selectedMethod !== "card") {
      return true;
    }

    if (
      !cardDetails.number ||
      !cardDetails.name ||
      !cardDetails.expiry ||
      !cardDetails.cvv
    ) {

      toast.error(
        "Please complete your card details"
      );

      return false;

    }

    return true;

  }

  async function handlePayment() {

    if (!validatePayment()) {
      return;
    }

    if (isSubmitting) {
      return;
    }

    const total =

      Math.max(
        getTotalPrice() -
        Number(checkoutData.discount || 0),
        0
      );

    const paid =

      isCod
        ? Math.min(500, total)
        : total;

    const remaining =

      isCod
        ? Math.max(total - paid, 0)
        : 0;

    const deliveryDate =
      getDeliveryDate();

    const orderPayload = {
      createdAt:
        checkoutData.createdAt ||
        Date.now(),
      cancelUntil:
        checkoutData.cancelUntil ||
        (
          Date.now() +
          (5 * 24 * 60 * 60 * 1000)
        ),
      items:
        cartItems.map(item => ({
          id:
            item.id,
          productId:
            item.productId ||
            item.id,
          name:
            item.name,
          image:
            item.image,
          quantity:
            item.quantity,
          price:
            item.price,
          variantId:
            item.variantId,
          variantLabel:
            item.variantLabel,
          variantDimensions:
            item.variantDimensions
        })),
      customer:
        checkoutData.customer ||
        "Guest",
      phone:
        checkoutData.phone ||
        "",
      address:
        checkoutData.address ||
        "",
      total:
        total,
      paid:
        paid,
      remaining:
        remaining,
      paymentMode:
        getPaymentLabel(),
      status:
        "Processing",
      deliveryDate:
        deliveryDate
    };

    try {

      setIsSubmitting(true);

      const response =
        await fetch(
          getApiUrl("/api/orders"),
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type":
                "application/json"
            },
            body:
              JSON.stringify(orderPayload)
          }
        );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
          "Failed to create order"
        );
      }

      clearCart();

      navigate(
        "/order-success",
        {
          state: {
            order:
              data.order
          }
        }
      );

    } catch (error) {

      toast.error(
        error.message ||
        "Unable to place order. Please try again."
      );

    } finally {

      setIsSubmitting(false);

    }

  }

  return (

    <div className="payment-page">

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

      <div className="payment-shell">

        <aside className="payment-summary-card">

          <div className="secure-heading">
            <span>
              <FaLock />
            </span>
            <div>
              <h1>Secure Payment</h1>
              <p>Encrypted checkout</p>
            </div>
          </div>

          <p className="amount-label">
            Amount to Pay
          </p>

          <h2 className="payment-amount">
            Rs. {amount}
          </h2>

          <div className="payment-mode-pill">
            <span>Mode</span>
            <strong>{paymentMode}</strong>
          </div>

          <div className="accepted-payments">
            <span>
              <img
                src={paymentLogos.gpay}
                alt="Google Pay"
              />
            </span>
            <span>
              <img
                src={paymentLogos.paytm}
                alt="Paytm"
              />
            </span>
            <span>
              <img
                src={paymentLogos.phonepe}
                alt="PhonePe"
              />
            </span>
            <span>
              <img
                src={paymentLogos.visa}
                alt="Visa"
              />
            </span>
            <span>
              <img
                src={paymentLogos.mastercard}
                alt="Mastercard"
              />
            </span>
          </div>

          <p className="delivery-date">
            Estimated Delivery:
            <strong>
              {getDeliveryDate()}
            </strong>
          </p>

          <div className="trust-grid">
            <div>
              <FaShieldAlt />
              <span>Secure</span>
            </div>
            <div>
              <FaCreditCard />
              <span>Safe Payment</span>
            </div>
            <div>
              <FaTruck />
              <span>Fast Delivery</span>
            </div>
          </div>

        </aside>

        <section className="payment-box">

          <div className="payment-box-header">
            <div>
              <p>Choose payment method</p>
              <h2>
                How would you like to pay?
              </h2>
            </div>
            <FaLock />
          </div>

          {isCod && (

            <button
              type="button"
              className={
                selectedMethod === "cod"
                  ? "payment-choice active"
                  : "payment-choice"
              }
              onClick={() =>
                setSelectedMethod("cod")
              }
            >
              <span className="choice-icon cod-icon">
                COD
              </span>
              <span>
                <strong>Cash on Delivery</strong>
                <small>Pay Rs.500 advance now</small>
              </span>
            </button>

          )}

          {!isCod && (

            <div className="payment-choice-grid">

              {paymentOptions.map(
                option => (

                  <button
                    key={option.id}
                    type="button"
                    className={
                      selectedMethod === option.id
                        ? "payment-choice active"
                        : "payment-choice"
                    }
                    onClick={() =>
                      setSelectedMethod(option.id)
                    }
                  >
                    <span className="choice-icon">
                      <img
                        src={option.logo}
                        alt={option.label}
                      />
                    </span>
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.type}</small>
                    </span>
                  </button>

                )
              )}

            </div>

          )}

          {!isCod && selectedMethod !== "card" && (

            <div className="upi-panel">
              <label htmlFor="upi-id">
                UPI ID / Mobile Number
              </label>
              <input
                id="upi-id"
                type="text"
                placeholder="example@upi or mobile number"
              />
              <p>
                A secure payment request will be created for the selected app.
              </p>
            </div>

          )}

          {!isCod && selectedMethod === "card" && (

            <div className="card-panel">
              <label htmlFor="card-number">
                Card Number
              </label>
              <input
                id="card-number"
                name="number"
                type="text"
                inputMode="numeric"
                maxLength="19"
                placeholder="1234 5678 9012 3456"
                value={cardDetails.number}
                onChange={handleCardChange}
              />

              <label htmlFor="card-name">
                Name on Card
              </label>
              <input
                id="card-name"
                name="name"
                type="text"
                placeholder="Card holder name"
                value={cardDetails.name}
                onChange={handleCardChange}
              />

              <div className="card-row">
                <div>
                  <label htmlFor="card-expiry">
                    Expiry
                  </label>
                  <input
                    id="card-expiry"
                    name="expiry"
                    type="text"
                    placeholder="MM/YY"
                    maxLength="5"
                    value={cardDetails.expiry}
                    onChange={handleCardChange}
                  />
                </div>

                <div>
                  <label htmlFor="card-cvv">
                    CVV
                  </label>
                  <input
                    id="card-cvv"
                    name="cvv"
                    type="password"
                    inputMode="numeric"
                    placeholder="123"
                    maxLength="4"
                    value={cardDetails.cvv}
                    onChange={handleCardChange}
                  />
                </div>
              </div>

              <div className="card-logos">
                <img
                  src={paymentLogos.visa}
                  alt="Visa"
                />
                <img
                  src={paymentLogos.mastercard}
                  alt="Mastercard"
                />
              </div>
            </div>

          )}

          {isCod && (

            <div className="cod-panel">
              <strong>Cash on Delivery selected</strong>
              <p>
                Pay Rs.500 now to confirm your order. The remaining amount is payable on delivery.
              </p>
            </div>

          )}

          <button
            className="pay-btn"
            type="button"
            onClick={handlePayment}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Processing..."
              : `Pay Rs. ${amount}`}
          </button>

        </section>

      </div>

    </div>

  );

}

export default Payment;

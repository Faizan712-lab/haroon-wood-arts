import "./Checkout.css";

import { useContext, useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import toast from "react-hot-toast";

import { CartContext } from "../context/CartContext";

import {
  PRODUCT_PLACEHOLDER,
  handleImageFallback
} from "../utils/imageFallback";

import {
  getVariantLabel
} from "../utils/productDisplay";

import {
  createUserAddress,
  getUserAddresses,
  updateUserAddress
} from "../utils/addresses";

const emptyAddress = {
  name: "",
  phone: "",
  street: "",
  locality: "",
  city: "",
  state: "",
  pincode: "",
  landmark: ""
};

function Checkout() {

  const navigate = useNavigate();

  const {
    cartItems,
    getTotalPrice
  } = useContext(CartContext);

  const [address, setAddress] =
    useState(emptyAddress);

  const [savedAddresses,
    setSavedAddresses] =
    useState([]);

  const [selectedAddressId,
    setSelectedAddressId] =
    useState("");

  const [paymentMethod,
    setPaymentMethod] =
    useState("COD");

  const [coupon,
    setCoupon] =
    useState("");

  const [discount,
    setDiscount] =
    useState(0);

  const [isSavingAddress,
    setIsSavingAddress] =
    useState(false);

  useEffect(() => {

    async function loadAddresses() {
      try {
        const saved =
          await getUserAddresses();

        setSavedAddresses(saved);

        if (saved.length > 0) {
          setAddress(saved[0]);

          setSelectedAddressId(
            String(saved[0].id)
          );
        }
      } catch {
        setSavedAddresses([]);
      }
    }

    loadAddresses();

  }, []);

  function handleChange(e) {

    setSelectedAddressId("");

    setAddress({
      ...address,
      [e.target.name]:
        e.target.value
    });

  }

  function isAddressComplete(
    addressData = address
  ) {

    return (
      addressData.name &&
      addressData.phone &&
      addressData.street &&
      addressData.locality &&
      addressData.city &&
      addressData.state &&
      addressData.pincode
    );

  }

  function formatAddress(
    addressData
  ) {

    const mainAddress = [
      addressData.street,
      addressData.locality,
      addressData.city,
      addressData.state
    ]
      .filter(Boolean)
      .join(", ");

    return `${mainAddress} - ${addressData.pincode}`;

  }

  function handleAddNewAddress() {

    setAddress(emptyAddress);

    setSelectedAddressId("");

  }

  function handleSelectAddress(
    savedAddress
  ) {

    setAddress(savedAddress);

    setSelectedAddressId(
      String(savedAddress.id)
    );

  }

  async function handleSaveAddress() {

    if (!isAddressComplete()) {

      toast.error(
        "Please fill all required address fields before saving"
      );

      return;

    }

    try {
      setIsSavingAddress(true);
      if (selectedAddressId) {
        const updatedAddress =
          await updateUserAddress(
            selectedAddressId,
            address
          );

        setSavedAddresses(
          savedAddresses.map(item =>
            String(item.id) ===
            String(selectedAddressId)
              ? updatedAddress
              : item
          )
        );

        setAddress(updatedAddress);

        toast.success("Address updated successfully");
      } else {
        const savedAddress =
          await createUserAddress(address);

        setSavedAddresses([
          savedAddress,
          ...savedAddresses
        ]);

        setAddress(savedAddress);

        setSelectedAddressId(
          String(savedAddress.id)
        );

        toast.success("Address saved successfully");
      }
    } catch (error) {
      toast.error(error.message || "Failed to save address");
    } finally {
      setIsSavingAddress(false);
    }

  }

  function applyCoupon() {

    if (coupon === "HAROON250") {

      setDiscount(250);

      toast.success(
        "Coupon Applied! Rs.250 Discount"
      );

    }

    else {

      toast.error(
        "Invalid Coupon"
      );

      setDiscount(0);

    }

  }

  const totalPrice =
    getTotalPrice();

  const finalTotal =
    Math.max(
      totalPrice - discount,
      0
    );

  const advance = 500;

  const remaining =
    Math.max(
      finalTotal - advance,
      0
    );

  const today =
    new Date();

  const deliveryDate =
    new Date();

  deliveryDate.setDate(
    today.getDate() + 5
  );

  function handleContinue() {

    if (!isAddressComplete()) {

      toast.error(
        "Please fill all required fields"
      );

      return;

    }

    const fullAddress =
      formatAddress(address);

    const deliveryAddress =

      address.landmark
        ? `${fullAddress}, Landmark: ${address.landmark}`
        : fullAddress;

    const createdAt =
      Date.now();

    const cancelUntil =

      createdAt +
      (5 * 24 * 60 * 60 * 1000);

    const checkoutData = {
      customer:
        address.name,
      phone:
        address.phone,
      address:
        deliveryAddress,
      paymentMethod:
        paymentMethod,
      discount:
        discount,
      createdAt:
        createdAt,
      cancelUntil:
        cancelUntil
    };

    const mode =

      paymentMethod === "COD"
        ? "COD"
        : "Online";

    navigate(
      `/payment?amount=${
        paymentMethod === "COD"
          ? advance
          : finalTotal
      }&mode=${mode}`,
      {
        state: {
          checkoutData
        }
      }
    );

  }

  return (

    <div className="checkout">

      <h1>
        Checkout
      </h1>

      <div className="stepper">

        <div className="step active">
          <span>1</span>
          <p>Address</p>
        </div>

        <div className="line"></div>

        <div className="step">
          <span>2</span>
          <p>Payment</p>
        </div>

        <div className="line"></div>

        <div className="step">
          <span>3</span>
          <p>Success</p>
        </div>

      </div>

      <div className="checkout-container">

        <div className="checkout-form">

          <div className="address-header">

            <h2>
              Delivery Address
            </h2>

            <div className="address-actions">

              <button
                className="address-add-btn"
                type="button"
                onClick={handleAddNewAddress}
              >
                Add Address
              </button>

              <button
                className="address-save-btn"
                type="button"
                onClick={handleSaveAddress}
                disabled={isSavingAddress}
              >
                {isSavingAddress ? "Saving..." : "Save Address"}
              </button>

            </div>

          </div>

          {savedAddresses.length > 0 && (

            <div className="saved-addresses">

              <p className="saved-addresses-title">
                Saved Addresses
              </p>

              <div className="saved-address-list">

                {savedAddresses.map(
                  savedAddress => (

                    <button
                      key={savedAddress.id}
                      type="button"
                      className={
                        String(savedAddress.id) ===
                        selectedAddressId
                          ? "saved-address active"
                          : "saved-address"
                      }
                      onClick={() =>
                        handleSelectAddress(
                          savedAddress
                        )
                      }
                    >
                      <strong>
                        {savedAddress.name}
                      </strong>

                      <span>
                        {formatAddress(savedAddress)}
                      </span>
                    </button>

                  )
                )}

              </div>

            </div>

          )}

          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={address.name}
            onChange={handleChange}
          />

          <input
            type="tel"
            name="phone"
            placeholder="Mobile Number"
            value={address.phone}
            onChange={handleChange}
          />

          <textarea
            name="street"
            placeholder="House No / Street Address"
            value={address.street}
            onChange={handleChange}
          />

          <input
            type="text"
            name="locality"
            placeholder="Locality"
            value={address.locality}
            onChange={handleChange}
          />

          <div className="row">

            <input
              type="text"
              name="city"
              placeholder="City"
              value={address.city}
              onChange={handleChange}
            />

            <input
              type="text"
              name="state"
              placeholder="State"
              value={address.state}
              onChange={handleChange}
            />

          </div>

          <div className="row">

            <input
              type="text"
              name="pincode"
              placeholder="Pincode"
              value={address.pincode}
              onChange={handleChange}
            />

            <input
              type="text"
              name="landmark"
              placeholder="Landmark"
              value={address.landmark}
              onChange={handleChange}
            />

          </div>

          <div className="coupon-box">

            <input
              type="text"
              placeholder="Enter Coupon Code"
              value={coupon}
              onChange={(e) =>
                setCoupon(e.target.value)
              }
            />

            <button
              type="button"
              onClick={applyCoupon}
            >
              Apply
            </button>

          </div>

          {discount > 0 && (

            <div className="coupon-success">
              Coupon applied successfully
            </div>

          )}

          <h2>
            Payment Method
          </h2>

          <div className="payment-method">

            <label
              className={
                paymentMethod === "COD"
                  ? "payment-option active"
                  : "payment-option"
              }
            >
              <input
                type="radio"
                value="COD"
                checked={
                  paymentMethod === "COD"
                }
                onChange={(e) =>
                  setPaymentMethod(e.target.value)
                }
              />

              <span className="payment-option-text">
                <strong>
                  Cash on Delivery
                </strong>
                <small>
                  Pay Rs.500 advance now
                </small>
              </span>
            </label>

            <label
              className={
                paymentMethod === "ONLINE"
                  ? "payment-option active"
                  : "payment-option"
              }
            >
              <input
                type="radio"
                value="ONLINE"
                checked={
                  paymentMethod === "ONLINE"
                }
                onChange={(e) =>
                  setPaymentMethod(e.target.value)
                }
              />

              <span className="payment-option-text">
                <strong>
                  Online Payment
                </strong>
                <small>
                  Pay the full amount now
                </small>
              </span>
            </label>

          </div>

          <button
            className="continue-btn"
            type="button"
            onClick={handleContinue}
          >
            Continue
          </button>

        </div>

        <div className="order-summary">

          <h2>
            Order Summary
          </h2>

          {cartItems.map(item => (

            <div
              key={item.cartKey || item.id}
              className="summary-item"
            >
              <img
                src={item.image || PRODUCT_PLACEHOLDER}
                alt={item.name}
                onError={handleImageFallback}
              />

              <div className="summary-text">
                <span>{item.name}</span>
                {getVariantLabel(item) && (
                  <span>
                    {getVariantLabel(item)}
                  </span>
                )}
                <span>Qty: {item.quantity}</span>
              </div>

              <div>
                Rs. {item.price * item.quantity}
              </div>
            </div>

          ))}

          <hr />

          <p className="delivery-estimate">
            Estimated Delivery:
            <strong>
              {" "}
              {deliveryDate.toDateString()}
            </strong>
          </p>

          {discount > 0 && (

            <div className="discount-row">
              <span>Discount</span>
              <span>-Rs. {discount}</span>
            </div>

          )}

          <h3>
            Total: Rs. {finalTotal}
          </h3>

          {paymentMethod === "COD" && (

            <>
              <p>
                Advance: Rs.500
              </p>

              <p>
                Remaining: Rs. {remaining}
              </p>
            </>

          )}

        </div>

      </div>

    </div>

  );

}

export default Checkout;

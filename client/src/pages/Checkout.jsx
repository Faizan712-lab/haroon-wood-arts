import "./Checkout.css";

import { useContext, useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import toast from "react-hot-toast";

import { CartContext } from "../context/CartContext";

import {
  PRODUCT_PLACEHOLDER,
  getPrimaryImage,
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

  const totalPrice =
    getTotalPrice();

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
      createdAt:
        createdAt,
      cancelUntil:
        cancelUntil
    };

    navigate(
      `/payment?amount=${totalPrice}&mode=COD`,
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
                src={getPrimaryImage(item) || PRODUCT_PLACEHOLDER}
                alt={item.name}
                loading="lazy"
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

              <div className="summary-price">
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

          <div className="summary-total-row">
            <span>Order Total</span>
            <strong>Rs. {totalPrice.toFixed(2)}</strong>
          </div>

          <p className="summary-payment-note">
            Choose your payment method and apply a coupon on the next step.
          </p>

        </div>

      </div>

    </div>

  );

}

export default Checkout;

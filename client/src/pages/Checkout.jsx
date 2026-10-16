import "./Checkout.css";

import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import logo from "../assets/logo.png";
import CheckoutStepper from "../components/CheckoutStepper";
import ConfirmModal from "../components/ConfirmModal";
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
  updateUserAddress,
  deleteUserAddress
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
    getTotalPrice,
    reconcileCart,
    hasUnavailableItems
  } = useContext(CartContext);

  const [address, setAddress] = useState(emptyAddress);
  const [originalAddress, setOriginalAddress] = useState(emptyAddress);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isDeletingAddress, setIsDeletingAddress] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate("/cart", { replace: true });
    }
  }, [cartItems.length, navigate]);

  useEffect(() => {
    async function loadAddresses() {
      try {
        const saved = await getUserAddresses();
        setSavedAddresses(saved);

        if (saved.length > 0) {
          setAddress(saved[0]);
          setOriginalAddress(saved[0]);
          setSelectedAddressId(String(saved[0].id));
        }
      } catch {
        setSavedAddresses([]);
      }
    }

    loadAddresses();
  }, []);

  function handleChange(e) {
    setAddress({
      ...address,
      [e.target.name]: e.target.value
    });
  }

  function isAddressComplete(addressData = address) {
    return Boolean(
      addressData.name?.trim() &&
      addressData.phone?.trim() &&
      addressData.street?.trim() &&
      addressData.locality?.trim() &&
      addressData.city?.trim() &&
      addressData.state?.trim() &&
      addressData.pincode?.trim()
    );
  }

  const isDirty = Boolean(
    selectedAddressId &&
    (
      (address.name || "").trim() !== (originalAddress.name || "").trim() ||
      (address.phone || "").trim() !== (originalAddress.phone || "").trim() ||
      (address.street || "").trim() !== (originalAddress.street || "").trim() ||
      (address.locality || "").trim() !== (originalAddress.locality || "").trim() ||
      (address.city || "").trim() !== (originalAddress.city || "").trim() ||
      (address.state || "").trim() !== (originalAddress.state || "").trim() ||
      (address.pincode || "").trim() !== (originalAddress.pincode || "").trim() ||
      (address.landmark || "").trim() !== (originalAddress.landmark || "").trim()
    )
  );

  function formatAddress(addressData) {
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
    setOriginalAddress(emptyAddress);
    setSelectedAddressId("");
  }

  function handleSelectAddress(savedAddress) {
    setAddress(savedAddress);
    setOriginalAddress(savedAddress);
    setSelectedAddressId(String(savedAddress.id));
  }

  async function handleSaveAddress() {
    if (!isAddressComplete()) {
      toast.error("Please fill all required address fields before saving");
      return;
    }

    try {
      setIsSavingAddress(true);
      if (selectedAddressId) {
        const updatedAddress = await updateUserAddress(
          selectedAddressId,
          address
        );

        setSavedAddresses(
          savedAddresses.map(item =>
            String(item.id) === String(selectedAddressId)
              ? updatedAddress
              : item
          )
        );

        setAddress(updatedAddress);
        setOriginalAddress(updatedAddress);
        toast.success("Address updated successfully");
      } else {
        const savedAddress = await createUserAddress(address);

        setSavedAddresses([savedAddress, ...savedAddresses]);
        setAddress(savedAddress);
        setOriginalAddress(savedAddress);
        setSelectedAddressId(String(savedAddress.id));
        toast.success("Address saved successfully");
      }
    } catch (error) {
      toast.error(error.message || "Failed to save address");
    } finally {
      setIsSavingAddress(false);
    }
  }

  async function handleDeleteAddress() {
    if (!selectedAddressId || isDeletingAddress) return;

    try {
      setIsDeletingAddress(true);
      await deleteUserAddress(selectedAddressId);

      const remaining = savedAddresses.filter(
        item => String(item.id) !== String(selectedAddressId)
      );

      setSavedAddresses(remaining);

      if (remaining.length > 0) {
        setAddress(remaining[0]);
        setOriginalAddress(remaining[0]);
        setSelectedAddressId(String(remaining[0].id));
      } else {
        setAddress(emptyAddress);
        setOriginalAddress(emptyAddress);
        setSelectedAddressId("");
      }

      toast.success("Address deleted successfully");
      setDeleteModalOpen(false);
    } catch (error) {
      toast.error(error.message || "Failed to delete address");
    } finally {
      setIsDeletingAddress(false);
    }
  }

  const totalPrice = getTotalPrice();

  const today = new Date();
  const deliveryDate = new Date();
  deliveryDate.setDate(today.getDate() + 5);

  async function handleContinue() {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty.");
      navigate("/cart");
      return;
    }

    if (hasUnavailableItems) {
      toast.error("Please remove unavailable items before continuing.");
      navigate("/cart");
      return;
    }

    if (!isAddressComplete()) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsCheckingOut(true);
    try {
      const reconResult = await reconcileCart();
      if (reconResult?.hasUnavailableItems) {
        toast.error("Some items are no longer available. Please review your cart.");
        navigate("/cart");
        return;
      }
      if (reconResult?.hasPriceChanges) {
        toast.error("Some product prices have changed. Please review your updated cart before continuing.");
        navigate("/cart");
        return;
      }

      const fullAddress = formatAddress(address);
      const deliveryAddress = address.landmark
        ? `${fullAddress}, Landmark: ${address.landmark}`
        : fullAddress;

      const createdAt = Date.now();
      const cancelUntil = createdAt + (5 * 24 * 60 * 60 * 1000);

      const checkoutData = {
        customer: address.name,
        phone: address.phone,
        address: deliveryAddress,
        createdAt,
        cancelUntil
      };

      sessionStorage.setItem(
        "haroonCheckoutData",
        JSON.stringify(checkoutData)
      );

      // Clear stale payment session data for a completely new checkout
      localStorage.removeItem("haroonCheckoutSessionId");
      sessionStorage.removeItem("haroonRazorpayPaymentResponse");

      navigate(
        `/payment?amount=${totalPrice}&mode=COD`,
        {
          state: {
            checkoutData
          }
        }
      );
    } catch {
      toast.error("Failed to verify cart. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  }

  return (
    <div className="checkout-page">
      <header className="checkout-header">
        <h1 className="checkout-title">Checkout Payment</h1>
        <p className="checkout-subtitle">Review your items and enter delivery details.</p>
      </header>

      <CheckoutStepper current={0} />

      <div className="checkout-container">
        <main className="checkout-main">
          <div className="address-card">
            <div className="address-header">
              <div>
                <h2 className="address-heading">Delivery Address</h2>
                <p className="address-subtext">Where should we deliver your order?</p>
              </div>

              <div className="address-actions">
                {selectedAddressId ? (
                  <>
                    <button
                      className="address-action-btn address-add-btn"
                      type="button"
                      onClick={handleAddNewAddress}
                      disabled={isSavingAddress || isDeletingAddress}
                    >
                      + Add New
                    </button>

                    {isDirty && (
                      <button
                        className="address-action-btn address-update-btn"
                        type="button"
                        onClick={handleSaveAddress}
                        disabled={isSavingAddress || isDeletingAddress || !isAddressComplete()}
                      >
                        {isSavingAddress ? "Updating..." : "Update Address"}
                      </button>
                    )}

                    <button
                      className="address-action-btn address-delete-btn"
                      type="button"
                      onClick={() => setDeleteModalOpen(true)}
                      disabled={isDeletingAddress || isSavingAddress}
                    >
                      {isDeletingAddress ? "Deleting..." : "Delete Address"}
                    </button>
                  </>
                ) : (
                  <>
                    {savedAddresses.length > 0 && (
                      <button
                        className="address-action-btn address-cancel-btn"
                        type="button"
                        onClick={() => handleSelectAddress(savedAddresses[0])}
                        disabled={isSavingAddress}
                      >
                        Cancel
                      </button>
                    )}

                    <button
                      className="address-action-btn address-save-btn"
                      type="button"
                      onClick={handleSaveAddress}
                      disabled={isSavingAddress || !isAddressComplete()}
                    >
                      {isSavingAddress ? "Saving..." : "Save Address"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {savedAddresses.length > 0 && (
              <div className="saved-addresses-section">
                <span className="saved-addresses-label">Saved Addresses</span>
                <div className="saved-address-list">
                  {savedAddresses.map(savedAddress => {
                    const isSelected = String(savedAddress.id) === selectedAddressId;
                    return (
                      <button
                        key={savedAddress.id}
                        type="button"
                        className={`saved-address-card ${isSelected ? "saved-address-card--active" : ""}`}
                        onClick={() => handleSelectAddress(savedAddress)}
                      >
                        <div className="saved-address-top">
                          <span className={`saved-address-radio ${isSelected ? "saved-address-radio--checked" : ""}`}>
                            {isSelected && <span className="saved-address-radio-dot" />}
                          </span>
                          <strong className="saved-address-name">{savedAddress.name}</strong>
                          {isSelected && <span className="saved-address-badge">Selected</span>}
                        </div>
                        <p className="saved-address-details">{formatAddress(savedAddress)}</p>
                        {savedAddress.phone && (
                          <span className="saved-address-phone">Phone: {savedAddress.phone}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="address-form">
              <span className="address-form-legend">
                {selectedAddressId ? "Selected Address Details" : "Enter Delivery Address"}
              </span>

              <div className="address-row address-row--two">
                <label className="address-field">
                  <span className="address-field__label">Full Name <span className="req">*</span></span>
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g. Haroon Wood"
                    value={address.name}
                    onChange={handleChange}
                    autoComplete="name"
                    required
                  />
                </label>

                <label className="address-field">
                  <span className="address-field__label">Mobile Number <span className="req">*</span></span>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="10-digit mobile number"
                    value={address.phone}
                    onChange={handleChange}
                    autoComplete="tel"
                    required
                  />
                </label>
              </div>

              <label className="address-field">
                <span className="address-field__label">Flat / House no. / Street Address <span className="req">*</span></span>
                <textarea
                  name="street"
                  placeholder="House or flat number, building name, street"
                  value={address.street}
                  onChange={handleChange}
                  autoComplete="street-address"
                  rows="2"
                  required
                />
              </label>

              <label className="address-field">
                <span className="address-field__label">Locality / Area <span className="req">*</span></span>
                <input
                  type="text"
                  name="locality"
                  placeholder="Locality, sector, or colony"
                  value={address.locality}
                  onChange={handleChange}
                  required
                />
              </label>

              <div className="address-row address-row--two">
                <label className="address-field">
                  <span className="address-field__label">City <span className="req">*</span></span>
                  <input
                    type="text"
                    name="city"
                    placeholder="City"
                    value={address.city}
                    onChange={handleChange}
                    autoComplete="address-level2"
                    required
                  />
                </label>

                <label className="address-field">
                  <span className="address-field__label">State <span className="req">*</span></span>
                  <input
                    type="text"
                    name="state"
                    placeholder="State"
                    value={address.state}
                    onChange={handleChange}
                    autoComplete="address-level1"
                    required
                  />
                </label>
              </div>

              <div className="address-row address-row--two">
                <label className="address-field">
                  <span className="address-field__label">Pincode <span className="req">*</span></span>
                  <input
                    type="text"
                    name="pincode"
                    placeholder="6-digit PIN code"
                    value={address.pincode}
                    onChange={handleChange}
                    autoComplete="postal-code"
                    maxLength="10"
                    required
                  />
                </label>

                <label className="address-field">
                  <span className="address-field__label">Landmark <span className="opt">(optional)</span></span>
                  <input
                    type="text"
                    name="landmark"
                    placeholder="Nearby landmark"
                    value={address.landmark}
                    onChange={handleChange}
                  />
                </label>
              </div>
            </div>

            <div className="address-cta-wrap">
              <button
                className="checkout-continue-btn"
                type="button"
                onClick={handleContinue}
                disabled={isCheckingOut}
              >
                {isCheckingOut ? "Checking Availability..." : "Continue to Payment"}
              </button>
            </div>
          </div>
        </main>

        <aside className="checkout-summary-card" aria-label="Order summary">
          <div className="summary-header">
            <h2 className="summary-heading">Order Summary</h2>
            <span className="summary-item-count">{cartItems.length} {cartItems.length === 1 ? "item" : "items"}</span>
          </div>

          <div className="summary-items-list">
            {cartItems.map(item => (
              <div
                key={item.cartKey || item.id}
                className="summary-item"
              >
                <div className="summary-item__img-box">
                  <img
                    src={getPrimaryImage(item) || PRODUCT_PLACEHOLDER}
                    alt={item.name}
                    loading="lazy"
                    onError={handleImageFallback}
                  />
                </div>

                <div className="summary-item__info">
                  <span className="summary-item__name">{item.name}</span>
                  {getVariantLabel(item) && (
                    <span className="summary-item__variant">
                      {getVariantLabel(item)}
                    </span>
                  )}
                  <span className="summary-item__qty">Qty: {item.quantity}</span>
                </div>

                <div className="summary-item__price">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="summary-divider" />

          <div className="summary-subtotal-rows">
            <div className="summary-row">
              <span>Items Subtotal</span>
              <span>₹{totalPrice.toFixed(2)}</span>
            </div>

            <div className="summary-row">
              <span>Delivery</span>
              <span className="summary-row--free">Free</span>
            </div>
          </div>

          <div className="summary-total-row">
            <span>Order Total</span>
            <strong>₹{totalPrice.toFixed(2)}</strong>
          </div>

          <div className="summary-delivery-note">
            <span className="summary-delivery-icon">📦</span>
            <div>
              <p className="summary-delivery-title">Estimated Delivery</p>
              <p className="summary-delivery-date">
                {deliveryDate.toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                })}
              </p>
            </div>
          </div>

          <div className="summary-trust-notice">
            <img src={logo} alt="Haroon Stores" className="summary-trust-logo" />
            <span>Haroon Stores · Secure Checkout</span>
          </div>
        </aside>
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Address"
        message="Are you sure you want to delete this delivery address? This action cannot be undone."
        confirmText={isDeletingAddress ? "Deleting..." : "Delete Address"}
        cancelText="Keep Address"
        danger={true}
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteAddress}
      />
    </div>
  );
}

export default Checkout;

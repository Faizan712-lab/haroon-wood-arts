import "./UserProfile.css";

import {
  useContext,
  useEffect,
  useRef,
  useState
} from "react";

import { useNavigate } from "react-router-dom";

import toast from "react-hot-toast";

import {
  getActiveUserSession,
  logoutUser,
  updateUserAccount
} from "../utils/auth";

import {
  getApiUrl
}
from "../utils/api";

import {
  createUserAddress,
  deleteUserAddress,
  getUserAddresses,
  updateUserAddress
} from "../utils/addresses";

import ConfirmModal from "../components/ConfirmModal";

import {
  WishlistContext
} from "../context/WishlistContext";

import {
  PRODUCT_PLACEHOLDER,
  handleImageFallback
} from "../utils/imageFallback";

import {
  getStockLabel,
  isOutOfStock
} from "../utils/productDisplay";

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

function ProfileRating({
  rating,
  reviewCount
}) {
  const safeRating =
    Number(rating || 0);

  const count =
    Number(reviewCount || 0);

  const roundedRating =
    Math.round(safeRating);

  return (
    <div className="profile-wishlist-rating">
      <span aria-label={`${safeRating.toFixed(1)} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={
              star <= roundedRating
                ? "filled"
                : ""
            }
          >
            ★
          </span>
        ))}
      </span>
      <small>
        {count > 0
          ? `${safeRating.toFixed(1)} (${count} ${count === 1 ? "review" : "reviews"})`
          : "No reviews yet"}
      </small>
    </div>
  );
}

function UserProfile() {

  const navigate = useNavigate();

  const {
    items: wishlistItems,
    count: wishlistCount,
    toggleWishlist
  } = useContext(WishlistContext);

  const [session, setSession] =
    useState(null);

  const [settings, setSettings] =
    useState({
      name: "",
      email: "",
      phone: "",
      password: ""
    });

  const [addresses, setAddresses] =
    useState([]);

  const [address, setAddress] =
    useState(emptyAddress);

  const [editingAddressId, setEditingAddressId] =
    useState("");

  const [orders, setOrders] =
    useState([]);

  const [message, setMessage] =
    useState("");

  const [deleteAddressId, setDeleteAddressId] =
    useState(null);

  const [logoutModalOpen, setLogoutModalOpen] =
    useState(false);

  const [isSavingAddress, setIsSavingAddress] =
    useState(false);

  const [isDeletingAddress, setIsDeletingAddress] =
    useState(false);

  const [isSavingProfile, setIsSavingProfile] =
    useState(false);

  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  const [showWishlist, setShowWishlist] =
    useState(false);

  const wishlistRef =
    useRef(null);

  useEffect(() => {

    async function loadSession() {
      const currentSession =
        await getActiveUserSession();

      setSession(currentSession);

      setSettings({
        name: currentSession?.name || "",
        email: currentSession?.email || "",
        phone: currentSession?.phone || "",
        password: ""
      });

      if (!currentSession) {
        setAddresses([]);
        return;
      }

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

        setOrders(
          response.ok && data.success
            ? data.orders || []
            : []
        );

      } catch {

        setOrders([]);

      }

      try {
        const userAddresses =
          await getUserAddresses();

        setAddresses(userAddresses);
      } catch {
        setAddresses([]);
      }
    }

    loadSession();

  }, []);

  useEffect(() => {
    if (!showWishlist) {
      return;
    }

    wishlistRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, [showWishlist]);

  const userOrders =
    orders;

  const totalSpent =
    userOrders.reduce(
      (sum, order) =>
        sum + Number(order.total || 0),
      0
    );

  const totalPurchased =
    userOrders.reduce(
      (sum, order) =>
        sum +
        (order.items || []).reduce(
          (itemSum, item) =>
            itemSum + Number(item.quantity || 0),
          0
        ),
      0
    );

  async function handleImageUpload(e) {
    const file =
      e.target.files[0];

    if (!file || !session) {
      return;
    }

    const reader =
      new FileReader();

    reader.onload = async () => {
      try {
        const updatedUser =
          await updateUserAccount({
            name: session.name,
            email: session.email,
            phone: session.phone,
            profileImage:
              reader.result
          });

        setSession(updatedUser);

        setMessage(
          "Profile picture updated."
        );
      } catch (error) {
        setMessage(error.message);
      }
    };

    reader.readAsDataURL(file);
  }

  function handleSettingsChange(e) {
    setMessage("");
    setSettings({
      ...settings,
      [e.target.name]:
        e.target.value
    });
  }

  async function saveSettings(e) {
    e.preventDefault();

    if (!session) {
      return;
    }

    const updates = {
      name:
        settings.name.trim(),
      email:
        settings.email.trim(),
      phone:
        settings.phone.trim()
    };

    if (settings.password) {
      if (settings.password.length < 6) {
        setMessage("Password must be at least 6 characters.");
        return;
      }

      updates.password =
        settings.password;
    }

    try {
      setIsSavingProfile(true);
      const nextSession =
        await updateUserAccount({
          ...updates,
          profileImage:
            session.profileImage || ""
        });

      setSession(nextSession);

      setSettings({
        name: nextSession?.name || "",
        email: nextSession?.email || "",
        phone: nextSession?.phone || "",
        password: ""
      });

      setMessage("");
      toast.success("Profile updated successfully");
    } catch (error) {
      setMessage(error.message);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  }

  function handleAddressChange(e) {
    setAddress({
      ...address,
      [e.target.name]:
        e.target.value
    });
  }

  function editAddress(item) {
    setEditingAddressId(String(item.id));
    setAddress({
      name: item.name || "",
      phone: item.phone || "",
      street: item.street || "",
      locality: item.locality || "",
      city: item.city || "",
      state: item.state || "",
      pincode: item.pincode || "",
      landmark: item.landmark || ""
    });
    setMessage("");
  }

  function cancelAddressEdit() {
    setEditingAddressId("");
    setAddress(emptyAddress);
    setMessage("");
  }

  async function addAddress(e) {
    e.preventDefault();

    if (
      !address.name ||
      !address.phone ||
      !address.street ||
      !address.locality ||
      !address.city ||
      !address.state ||
      !address.pincode
    ) {
      setMessage("Please fill the required address fields.");
      return;
    }

    try {
      setIsSavingAddress(true);
      if (editingAddressId) {
        const updatedAddress =
          await updateUserAddress(
            editingAddressId,
            address
          );

        setAddresses(
          addresses.map(item =>
            String(item.id) === editingAddressId
              ? updatedAddress
              : item
          )
        );

        setMessage("");
        toast.success("Address updated successfully");
      } else {
        const savedAddress =
          await createUserAddress(address);

        setAddresses([
          savedAddress,
          ...addresses
        ]);

        setMessage("");
        toast.success("Address saved successfully");
      }

      setEditingAddressId("");
      setAddress(emptyAddress);
    } catch (error) {
      setMessage(error.message);
      toast.error(error.message || "Failed to save address");
    } finally {
      setIsSavingAddress(false);
    }
  }

  async function removeAddress(id) {
    try {
      setIsDeletingAddress(true);
      await deleteUserAddress(id);

      setAddresses(
        addresses.filter(item =>
          item.id !== id
        )
      );

      if (String(id) === editingAddressId) {
        setEditingAddressId("");
        setAddress(emptyAddress);
      }

      setMessage("");
      toast.success("Address deleted successfully");
    } catch (error) {
      setMessage(error.message);
      toast.error(error.message || "Failed to delete address");
    } finally {
      setIsDeletingAddress(false);
      setDeleteAddressId(null);
    }
  }

  async function handleLogout() {
    try {
      setIsLoggingOut(true);
      await logoutUser();
      toast.success("Logged out successfully");
      navigate("/");
    } catch (error) {
      toast.error(error.message || "Logout failed");
    } finally {
      setIsLoggingOut(false);
      setLogoutModalOpen(false);
    }
  }

  return (
    <div className="profile-page">
      <section className="profile-header-card">
        <div className="profile-avatar-large">
          {session?.profileImage ? (
            <img
              src={session.profileImage}
              alt={session.name}
            />
          ) : (
            <span></span>
          )}
        </div>

        <div className="profile-header-text">
          <h1>{session?.name}</h1>
          <p>{session?.email}</p>
          <p>{session?.phone}</p>
        </div>

        <div className="profile-header-actions">
          <label className="profile-upload-btn">
            Edit Picture
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
            />
          </label>

          <button
            type="button"
            className="profile-wishlist-shortcut"
            onClick={() =>
              setShowWishlist(prev => !prev)
            }
          >
            {showWishlist ? "Hide Wishlist" : "Wishlist"}
          </button>
        </div>
      </section>

      {message && (
        <div className="profile-message">
          {message}
        </div>
      )}

      <section className="profile-stats">
        <div>
          <span>Total Orders</span>
          <strong>{userOrders.length}</strong>
        </div>
        <div>
          <span>Total Purchased</span>
          <strong>{totalPurchased}</strong>
        </div>
        <div>
          <span>Total Spend</span>
          <strong>Rs. {totalSpent}</strong>
        </div>
        <div>
          <span>Wishlist Items</span>
          <strong>{wishlistCount}</strong>
        </div>
      </section>

      <div className="profile-grid">
        <section className="profile-panel">
          <h2>Saved Addresses</h2>

          <form
            className="profile-address-form"
            onSubmit={addAddress}
          >
            <input
              name="name"
              placeholder="Full name"
              value={address.name}
              onChange={handleAddressChange}
            />
            <input
              name="phone"
              placeholder="Phone number"
              value={address.phone}
              onChange={handleAddressChange}
            />
            <input
              name="street"
              placeholder="House / Street"
              value={address.street}
              onChange={handleAddressChange}
            />
            <input
              name="locality"
              placeholder="Locality"
              value={address.locality}
              onChange={handleAddressChange}
            />
            <div className="profile-form-row">
              <input
                name="city"
                placeholder="City"
                value={address.city}
                onChange={handleAddressChange}
              />
              <input
                name="state"
                placeholder="State"
                value={address.state}
                onChange={handleAddressChange}
              />
            </div>
            <div className="profile-form-row">
              <input
                name="pincode"
                placeholder="Pincode"
                value={address.pincode}
                onChange={handleAddressChange}
              />
              <input
                name="landmark"
                placeholder="Landmark"
                value={address.landmark}
                onChange={handleAddressChange}
              />
            </div>
            <button
              type="submit"
              disabled={isSavingAddress}
            >
              {isSavingAddress
                ? "Saving..."
                : editingAddressId
                  ? "Update Address"
                  : "Add Address"}
            </button>
            {editingAddressId && (
              <button
                type="button"
                onClick={cancelAddressEdit}
              >
                Cancel
              </button>
            )}
          </form>

          <div className="profile-address-list">
            {addresses.length === 0 ? (
              <p>No saved addresses yet.</p>
            ) : (
              addresses.map(item => (
                <div
                  key={item.id}
                  className="profile-address-card"
                >
                  <strong>{item.name}</strong>
                  <span>
                    {item.street}, {item.locality}, {item.city}, {item.state} - {item.pincode}
                  </span>
                  <small>{item.phone}</small>
                  <div className="profile-address-actions">
                    <button
                      type="button"
                      className="profile-address-edit-btn"
                      onClick={() =>
                        editAddress(item)
                      }
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="profile-address-delete-btn"
                      onClick={() =>
                        setDeleteAddressId(item.id)
                      }
                      disabled={isDeletingAddress}
                    >
                      {isDeletingAddress &&
                      deleteAddressId === item.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="profile-panel">
          <h2>Settings</h2>

          <form
            className="profile-settings-form"
            onSubmit={saveSettings}
          >
            <label>
              Name
              <input
                name="name"
                value={settings.name}
                onChange={handleSettingsChange}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                name="email"
                value={settings.email}
                onChange={handleSettingsChange}
              />
            </label>
            <label>
              Phone
              <input
                name="phone"
                value={settings.phone}
                onChange={handleSettingsChange}
              />
            </label>
            <label>
              New Password
              <input
                type="password"
                name="password"
                placeholder="Leave blank to keep current"
                value={settings.password}
                onChange={handleSettingsChange}
              />
            </label>

            <button
              type="submit"
              disabled={isSavingProfile}
            >
              {isSavingProfile ? "Saving..." : "Save Changes"}
            </button>
          </form>

          <button
            className="profile-logout-btn"
            type="button"
            onClick={() =>
              setLogoutModalOpen(true)
            }
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </section>
      </div>

      {showWishlist && (
        <section
          ref={wishlistRef}
          className="profile-panel profile-wishlist-panel profile-wishlist-section"
        >
          <h2>Wishlist</h2>

          {wishlistItems.length === 0 ? (
            <p className="profile-wishlist-empty">
              No products in your wishlist yet.
            </p>
          ) : (
            <div className="profile-wishlist-list">
              {wishlistItems.map(product => (
                <article
                  key={product.productId || product.id}
                  className="profile-wishlist-card"
                >
                  <img
                    src={product.image || PRODUCT_PLACEHOLDER}
                    alt={product.name}
                    onError={handleImageFallback}
                  />

                  <div className="profile-wishlist-info">
                    <h3>{product.name}</h3>
                    <strong>Rs. {product.price}</strong>
                  {getStockLabel(product) && (
                    <span
                      className={
                        isOutOfStock(product)
                          ? "profile-stock-badge out"
                          : "profile-stock-badge low"
                      }
                    >
                      {getStockLabel(product)}
                    </span>
                  )}
                    <ProfileRating
                      rating={product.averageRating}
                      reviewCount={product.reviewCount}
                    />
                  </div>

                  <div className="profile-wishlist-actions">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/product/${product.productId || product.id}`)
                      }
                    >
                      View Product
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        toggleWishlist({
                          ...product,
                          id: product.productId || product.id
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <ConfirmModal
        isOpen={logoutModalOpen}
        title="Logout"
        message="Are you sure you want to log out?"
        cancelText="Cancel"
        confirmText="Logout"
        danger
        onCancel={() =>
          setLogoutModalOpen(false)
        }
        onConfirm={handleLogout}
      />

      <ConfirmModal
        isOpen={deleteAddressId !== null}
        title="Delete Address"
        message="Are you sure you want to remove this address?"
        cancelText="Cancel"
        confirmText="Delete Address"
        danger
        onCancel={() =>
          setDeleteAddressId(null)
        }
        onConfirm={() =>
          removeAddress(deleteAddressId)
        }
      />
    </div>
  );

}

export default UserProfile;

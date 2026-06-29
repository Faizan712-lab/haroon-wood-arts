import "./Navbar.css";

import {
  NavLink,
  Link,
  useNavigate
}
from "react-router-dom";

import {
  FaShoppingCart
}
from "react-icons/fa";

import logo
from "../assets/logo.png";

import {
  useContext,
  useEffect,
  useState
}
from "react";

import toast from "react-hot-toast";

import {
  CartContext
}
from "../context/CartContext";

import {
  getActiveUserSession,
  logoutUser
}
from "../utils/auth";

import {
  getApiUrl
}
from "../utils/api";

import {
  PRODUCT_PLACEHOLDER,
  handleImageFallback
}
from "../utils/imageFallback";

import ConfirmModal from "./ConfirmModal";

function Navbar() {

  const navigate =
    useNavigate();

  const {
    cartItems
  } = useContext(CartContext);

  /* SEARCH */

  const [search,
    setSearch] =
    useState("");

  const [products,
    setProducts] =
    useState([]);

  const [filteredProducts,
    setFilteredProducts] =
    useState([]);

  const [userSession,
    setUserSession] =
    useState(null);

  const [mobileMenuOpen,
    setMobileMenuOpen] =
    useState(false);

  const [logoutModalOpen,
    setLogoutModalOpen] =
    useState(false);

  const [isLoggingOut,
    setIsLoggingOut] =
    useState(false);

  /* LOAD PRODUCTS */

  useEffect(() => {

    async function fetchProducts() {

      try {

        const response = await fetch(
          getApiUrl("/api/products"),
          {
            cache: "no-store"
          }
        );

        const data =
          await response.json();

        if (response.ok && data.success) {

          setProducts(
            data.products
          );

        }

      } catch (error) {

        console.error(
          "Failed to load search products:",
          error
        );

      }

    }

    fetchProducts();

  }, []);

  /* FILTER SEARCH */

  useEffect(() => {

    if (!search.trim()) {

      setFilteredProducts([]);

      return;

    }

    const filtered =

      products.filter(product =>

        product.name
          .toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||

        product.category
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          )

      );

    setFilteredProducts(
      filtered.slice(0, 5)
    );

  }, [search, products]);

  useEffect(() => {

    let active = true;

    async function refreshSession() {
      const session =
        await getActiveUserSession();

      if (active) {
        setUserSession(session);
      }
    }

    refreshSession();

    window.addEventListener(
      "userAuthChanged",
      refreshSession
    );

    const sessionTimer =
      setInterval(
        refreshSession,
        60 * 1000
      );

    return () => {
      active = false;

      window.removeEventListener(
        "userAuthChanged",
        refreshSession
      );
      clearInterval(sessionTimer);
    };

  }, []);

  /* TOTAL CART */

  const totalQuantity =

    cartItems.reduce(

      (sum, item) =>

        sum + item.quantity,

      0

    );

  /* OPEN PRODUCT */

  function openProduct(id) {

    setSearch("");

    setFilteredProducts([]);

    setMobileMenuOpen(false);

    navigate(
      `/product/${id}`
    );

  }

  async function handleUserLogout() {
    setIsLoggingOut(true);

    try {
      await logoutUser();

      setUserSession(null);

      setMobileMenuOpen(false);

      toast.success("Logged out successfully");

      navigate("/");
    } catch (error) {
      toast.error(
        error.message || "Logout failed"
      );
    } finally {
      setIsLoggingOut(false);
      setLogoutModalOpen(false);
    }

  }

  return (

    <nav
      className={
        mobileMenuOpen
          ? "navbar mobile-menu-open"
          : "navbar"
      }
    >

      <button
        type="button"
        className="mobile-menu-toggle"
        aria-label="Open navigation menu"
        aria-expanded={mobileMenuOpen}
        onClick={() =>
          setMobileMenuOpen(
            open => !open
          )
        }
      >
        <span className="menu-bars">
          <span></span>
          <span></span>
          <span></span>
        </span>

      </button>

      {userSession && (

        <Link
          to="/profile"
          className="mobile-profile-link"
          aria-label="Open profile"
          onClick={() =>
            setMobileMenuOpen(false)
          }
        >
          {userSession.profileImage && (
            <img
              src={userSession.profileImage}
              alt={userSession.name}
            />
          )}
        </Link>

      )}

      {/* LEFT */}

      <div className="nav-left">

        <Link
          to="/"
          className="logo-link"
        >

          <img
            src={logo}
            alt="logo"
            className="logo"
          />

          <h2 className="brand-name">

            Haroon Stores

          </h2>

        </Link>

      </div>

      <Link
        to="/cart"
        className="mobile-cart-link"
        aria-label="Open cart"
      >
        <FaShoppingCart />

        {totalQuantity > 0 && (

          <span className="cart-count">

            {totalQuantity}

          </span>

        )}

      </Link>

      {/* SEARCH */}

      <div className="nav-search">

        <input

          type="text"

          placeholder="Search products..."

          value={search}

          onChange={(e)=>

            setSearch(
              e.target.value
            )

          }

        />

        {/* RESULTS */}

        {filteredProducts.length > 0 && (

          <div className="search-results">

            {filteredProducts.map(product => (

              <div

                key={product.id}

                className="search-item"

                onClick={() =>

                  openProduct(
                    product.id
                  )

                }

              >

                <img

                  src={product.image || PRODUCT_PLACEHOLDER}

                  alt={product.name}

                  onError={handleImageFallback}

                />

                <div>

                  <h4>
                    {product.name}
                  </h4>

                  <p>
                    {product.category}
                  </p>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* RIGHT */}

      <ul
        className="nav-links"
        onClick={(event) => {
          if (event.target.closest("a")) {
            setMobileMenuOpen(false);
          }
        }}
      >

        <li>

          <NavLink to="/" end>

            Home

          </NavLink>

        </li>

        <li>

          <NavLink to="/shop">

            Shop

          </NavLink>

        </li>

        <li>

          <NavLink to="/categories">

            Categories

          </NavLink>

        </li>

        <li>

          <NavLink to="/orders">

            Orders

          </NavLink>

        </li>

        <li>

          <NavLink to="/contact">

            Contact Us

          </NavLink>

        </li>

        <li>

          <NavLink to="/about">

            About Us

          </NavLink>

        </li>

        <li className="user-auth-link">

          {userSession ? (

            <>

              <Link
                to="/profile"
                className="profile-avatar-link desktop-profile-link"
                aria-label="Open profile"
              >
                {userSession.profileImage && (
                  <img
                    src={userSession.profileImage}
                    alt={userSession.name}
                  />
                )}
              </Link>

              <Link
                to="/profile"
                className="mobile-view-profile-link"
              >
                View Profile
              </Link>

            </>

          ) : (

            <NavLink to="/login">

              Login

            </NavLink>

          )}

        </li>

        {userSession && (

          <li className="mobile-user-logout">

            <button
              type="button"
              onClick={() =>
                setLogoutModalOpen(true)
              }
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>

          </li>

        )}

        {/* CART */}

        <li className="cart-icon">

          <Link to="/cart">

            🛒

            {totalQuantity > 0 && (

              <span className="cart-count">

                {totalQuantity}

              </span>

            )}

          </Link>

        </li>

      </ul>

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
        onConfirm={handleUserLogout}
      />

    </nav>

  );

}

export default Navbar;

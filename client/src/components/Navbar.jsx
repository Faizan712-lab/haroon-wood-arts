import "./Navbar.css";

import {
  NavLink,
  Link,
  useNavigate,
  useLocation
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
  useRef,
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
  getPrimaryImage,
  handleImageFallback
}
from "../utils/imageFallback";

import ConfirmModal from "./ConfirmModal";

function Navbar() {

  const location = useLocation();

  const navigate =
    useNavigate();

  const isOrderDetailsPath =
    location.pathname === "/order-details" ||
    location.pathname.startsWith("/order-details/");

  const {
    cartItems
  } = useContext(CartContext);

  /* SEARCH */

  const [search, setSearch] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

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

  /* CLOSE MENU & DROPDOWN ON ROUTE CHANGE */
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowDropdown(false);
  }, [location.pathname, location.search]);

  /* SYNC NAVBAR SEARCH WITH URL SEARCH PARAM WHEN ON SHOP PAGE */
  useEffect(() => {
    if (location.pathname === "/shop") {
      const q = new URLSearchParams(location.search).get("search") || "";
      setSearch(q);
    }
  }, [location.pathname, location.search]);

  /* PREVENT BACKGROUND SCROLL WHEN MOBILE MENU IS OPEN */
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  /* CLOSE SEARCH DROPDOWN ON OUTSIDE CLICK OR ESCAPE */
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setShowDropdown(false);
        if (searchInputRef.current) {
          searchInputRef.current.blur();
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  /* FILTER SEARCH */

  useEffect(() => {
    const trimmed = search.trim();
    if (!trimmed) {
      setFilteredProducts([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ search: trimmed, page: "1", limit: "5" });
        const response = await fetch(getApiUrl(`/api/products?${params}`), {
          cache: "no-store",
          signal: controller.signal
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setFilteredProducts(data.products || []);
        } else {
          setFilteredProducts([]);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Failed to load search products:", error);
          setFilteredProducts([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [search]);

  function handleSearchSubmit(event) {
    if (event) {
      event.preventDefault();
    }
    const trimmed = search.trim();
    setShowDropdown(false);
    setMobileMenuOpen(false);
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
    if (trimmed) {
      navigate(`/shop?search=${encodeURIComponent(trimmed)}`);
    } else if (location.pathname === "/shop") {
      navigate("/shop");
    }
  }

  function handleClearNavSearch() {
    setSearch("");
    setFilteredProducts([]);
    setShowDropdown(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (location.pathname === "/shop") {
      const currentParam = new URLSearchParams(location.search).get("search");
      if (currentParam) {
        navigate("/shop");
      }
    }
  }

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

    setShowDropdown(false);

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

      <form
        ref={searchContainerRef}
        className="nav-search"
        role="search"
        onSubmit={handleSearchSubmit}
      >
        <button
          type="submit"
          className="nav-search-btn"
          aria-label="Submit search"
        >
          <svg
            className="nav-search-svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>

        <input
          ref={searchInputRef}
          type="search"
          placeholder="Search products..."
          aria-label="Search products"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => {
            if (search.trim()) {
              setShowDropdown(true);
            }
          }}
        />

        {search && (
          <button
            type="button"
            className="nav-search-clear-btn"
            aria-label="Clear search"
            onClick={handleClearNavSearch}
          >
            ×
          </button>
        )}

        {/* RESULTS */}
        {showDropdown && search.trim() && (
          <div className="search-results">
            {filteredProducts.length > 0 ? (
              <>
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    className="search-item"
                    onClick={() => openProduct(product.id)}
                  >
                    <img
                      src={getPrimaryImage(product) || PRODUCT_PLACEHOLDER}
                      alt={product.name}
                      loading="lazy"
                      onError={handleImageFallback}
                    />
                    <div className="search-item-info">
                      <h4 className="search-item-title">{product.name}</h4>
                      <p className="search-item-cat">{product.category}</p>
                    </div>
                  </div>
                ))}
                <div
                  className="search-results-footer"
                  onClick={handleSearchSubmit}
                >
                  <span>View all results for &ldquo;{search.trim()}&rdquo;</span>
                  <span className="search-footer-arrow">→</span>
                </div>
              </>
            ) : !searchLoading ? (
              <div className="search-dropdown-empty">
                <p>No products found for &ldquo;{search.trim()}&rdquo;</p>
                <button
                  type="button"
                  className="search-dropdown-shop-link"
                  onClick={handleSearchSubmit}
                >
                  Search on Shop page →
                </button>
              </div>
            ) : null}
          </div>
        )}
      </form>

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

          <NavLink
            to="/orders"
            className={({ isActive }) =>
              isActive || isOrderDetailsPath ? "active" : undefined
            }
          >

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

      {mobileMenuOpen && (
        <div
          className="mobile-menu-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </nav>

  );

}

export default Navbar;

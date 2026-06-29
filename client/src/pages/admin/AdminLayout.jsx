import "./Admin.css";

import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  FaBoxOpen,
  FaChartLine,
  FaCog,
  FaFolderOpen,
  FaPlusCircle,
  FaShoppingBag,
  FaSignOutAlt,
  FaUserShield
} from "react-icons/fa";
import toast from "react-hot-toast";

import ConfirmModal from "../../components/ConfirmModal";
import { getActiveAdminSession, logoutAdmin } from "../../utils/auth";

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    let active = true;

    async function checkAdminSession() {
      const session = await getActiveAdminSession();

      if (!active) return;

      if (!session) {
        navigate("/admin-login", { replace: true });
        return;
      }

      setAdmin(session);
      setCheckingAuth(false);
    }

    checkAdminSession();
    window.addEventListener("adminAuthChanged", checkAdminSession);

    return () => {
      active = false;
      window.removeEventListener("adminAuthChanged", checkAdminSession);
    };
  }, [navigate]);

  async function handleLogout() {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      await logoutAdmin();
      toast.success("Logged out successfully");
      navigate("/admin-login", { replace: true });
    } catch (error) {
      toast.error(error.message || "Logout failed");
    } finally {
      setIsLoggingOut(false);
      setLogoutModalOpen(false);
    }
  }

  function goToAdmin(path) {
    setMobileMenuOpen(false);
    navigate(path);
  }

  const adminPageTitle =
    location.pathname === "/admin/dashboard"
      ? "Dashboard"
      : location.pathname === "/admin/orders"
        ? "Orders"
        : location.pathname === "/admin/products"
          ? "Products"
          : location.pathname === "/admin/categories"
            ? "Categories"
            : location.pathname === "/admin/add-product"
              ? "Add Product"
              : location.pathname === "/admin/settings"
                ? "Settings"
                : "Admin";

  const adminName = admin?.name || "Admin";
  const adminDesignation = admin?.designation || "Administrator";
  const adminEmail = admin?.email || "";

  if (checkingAuth) {
    return <div className="admin-loading">Loading...</div>;
  }

  return (
    <div className={mobileMenuOpen ? "admin-layout admin-menu-open" : "admin-layout"}>
      <header className="admin-mobile-topbar">
        <button
          type="button"
          className="admin-mobile-toggle"
          aria-label="Open admin menu"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(open => !open)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className="admin-mobile-profile">
          <strong>{adminName}</strong>
          <span>{adminDesignation}</span>
        </div>
      </header>

      <button
        type="button"
        className="admin-sidebar-backdrop"
        aria-label="Close admin menu"
        onClick={() => setMobileMenuOpen(false)}
      />

      <aside className="admin-sidebar">
        <div>
          <div className="admin-sidebar-profile">
            <div className="admin-sidebar-avatar">
              {admin?.profileImage ? (
                <img src={admin.profileImage} alt={adminName} />
              ) : (
                <FaUserShield />
              )}
            </div>
            <div className="admin-sidebar-info">
              <strong>{adminName}</strong>
              <span>{adminDesignation}</span>
              {adminEmail ? <a href={`mailto:${adminEmail}`}>{adminEmail}</a> : null}
            </div>
          </div>

          <div className="admin-menu">
            <button
              className={location.pathname === "/admin/dashboard" ? "active-admin-link" : ""}
              onClick={() => goToAdmin("/admin/dashboard")}
            >
              <FaChartLine /> Dashboard
            </button>

            <button
              className={location.pathname === "/admin/orders" ? "active-admin-link" : ""}
              onClick={() => goToAdmin("/admin/orders")}
            >
              <FaBoxOpen /> Orders
            </button>

            <button
              className={location.pathname === "/admin/products" ? "active-admin-link" : ""}
              onClick={() => goToAdmin("/admin/products")}
            >
              <FaShoppingBag /> Products
            </button>

            <button
              className={location.pathname === "/admin/categories" ? "active-admin-link" : ""}
              onClick={() => goToAdmin("/admin/categories")}
            >
              <FaFolderOpen /> Categories
            </button>

            <button
              className={location.pathname === "/admin/add-product" ? "active-admin-link" : ""}
              onClick={() => goToAdmin("/admin/add-product")}
            >
              <FaPlusCircle /> Add Product
            </button>

            <button
              className={location.pathname === "/admin/settings" ? "active-admin-link" : ""}
              onClick={() => goToAdmin("/admin/settings")}
            >
              <FaCog /> Settings
            </button>
          </div>
        </div>

        <button
          className="logout-btn"
          onClick={() => setLogoutModalOpen(true)}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            "Logging out..."
          ) : (
            <>
              <FaSignOutAlt /> Logout
            </>
          )}
        </button>
      </aside>

      <main className="admin-content">
        <section className="admin-shell-header">
          <div>
            <span>Welcome back,</span>
            <h1>{adminName}</h1>
            <p>{adminDesignation}</p>
          </div>
          <div className="admin-shell-pill">{adminPageTitle}</div>
        </section>

        <Outlet />
      </main>

      <ConfirmModal
        isOpen={logoutModalOpen}
        title="Logout"
        message="Are you sure you want to log out from the admin panel?"
        cancelText="Cancel"
        confirmText="Logout"
        onCancel={() => setLogoutModalOpen(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}

export default AdminLayout;

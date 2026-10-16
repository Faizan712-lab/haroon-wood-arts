import "./Admin.css";

import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  FaBoxOpen,
  FaCheckCircle,
  FaClipboardList,
  FaClock,
  FaExclamationTriangle,
  FaFolderOpen,
  FaMoneyBillWave,
  FaPlusCircle,
  FaShoppingBag,
  FaTruck,
  FaWallet,
  FaArrowRight
} from "react-icons/fa";

import { getApiUrl } from "../../utils/api";

function AdminDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setIsLoading(true);
        const [ordersResponse, productsResponse] = await Promise.all([
          fetch(getApiUrl("/api/orders"), {
            credentials: "include",
            cache: "no-store"
          }),
          fetch(getApiUrl("/api/products"), {
            cache: "no-store"
          })
        ]);

        const ordersData = await ordersResponse.json();
        const productsData = await productsResponse.json();

        setOrders(
          ordersResponse.ok && ordersData.success
            ? ordersData.orders || []
            : []
        );

        setProducts(
          productsResponse.ok && productsData.success
            ? productsData.products || []
            : []
        );
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        setOrders([]);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  // Accurate revenue calculation
  const realizedRevenue = orders.reduce((sum, order) => {
    const status = String(order.status || "").toLowerCase().trim();
    if (["payment pending", "payment expired", "cancelled", "refund completed"].includes(status)) {
      return sum;
    }
    if (status === "delivered") {
      return sum + Number(order.total || 0);
    }
    return sum + Number(order.paid || 0);
  }, 0);

  const pendingCodRevenue = orders.reduce((sum, order) => {
    const status = String(order.status || "").toLowerCase().trim();
    if (
      order.paymentMode === "COD" &&
      !["delivered", "cancelled", "refund completed", "payment pending", "payment expired"].includes(status)
    ) {
      return sum + Number(order.remaining || 0);
    }
    return sum;
  }, 0);

  const deliveredOrders = orders.filter(
    order => String(order.status || "").toLowerCase() === "delivered"
  ).length;

  const inProgressOrders = orders.filter(order => {
    const status = String(order.status || "").toLowerCase().trim();
    return !["delivered", "cancelled", "refund completed", "payment pending", "payment expired"].includes(status);
  }).length;

  const lowStockProducts = products.filter(product => {
    const isOutOfStock =
      product.stockStatus === "out_of_stock" ||
      product.stock_status === "out_of_stock" ||
      (Number(product.stock || 0) <= 5 && (!product.variants || product.variants.length === 0));
    return isOutOfStock;
  });

  function openOrderStatus(status) {
    navigate(`/admin/orders?status=${encodeURIComponent(status)}`);
  }

  function handleCardKey(event, action) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  }

  const statCards = [
    {
      label: "Total Orders",
      value: orders.length,
      subtext: `${inProgressOrders} active / in progress`,
      icon: <FaClipboardList />,
      accent: "#684832",
      onClick: () => navigate("/admin/orders")
    },
    {
      label: "Realized Revenue",
      value: `₹${Math.round(realizedRevenue).toLocaleString()}`,
      subtext: "Collected online & delivered",
      icon: <FaWallet />,
      accent: "#2E7D32"
    },
    {
      label: "Pending COD Due",
      value: `₹${Math.round(pendingCodRevenue).toLocaleString()}`,
      subtext: "Due upon delivery",
      icon: <FaClock />,
      accent: "#E65100"
    },
    {
      label: "Active Orders",
      value: inProgressOrders,
      subtext: "Requires processing/shipping",
      icon: <FaTruck />,
      accent: "#1976D2",
      onClick: () => openOrderStatus("Processing")
    },
    {
      label: "Delivered Orders",
      value: deliveredOrders,
      subtext: "Completed fulfillments",
      icon: <FaCheckCircle />,
      accent: "#388E3C",
      onClick: () => openOrderStatus("Delivered")
    },
    {
      label: "Total Catalog Items",
      value: products.length,
      subtext: `${lowStockProducts.length} low or out of stock`,
      icon: <FaShoppingBag />,
      accent: "#8D6E63",
      onClick: () => navigate("/admin/products")
    }
  ];

  const quickActions = [
    {
      label: "Manage Orders",
      description: "View and update orders",
      icon: <FaBoxOpen />,
      onClick: () => navigate("/admin/orders")
    },
    {
      label: "Add Product",
      description: "Add to your catalog",
      icon: <FaPlusCircle />,
      onClick: () => navigate("/admin/add-product")
    },
    {
      label: "Categories",
      description: "Organize your catalog",
      icon: <FaFolderOpen />,
      onClick: () => navigate("/admin/categories")
    },
    {
      label: "View Products",
      description: "Manage products and stock",
      icon: <FaShoppingBag />,
      onClick: () => navigate("/admin/products")
    }
  ];

  // Latest 6 orders for the recent table
  const recentOrders = orders.slice(0, 6);

  return (
    <div className="admin-dashboard-content">
      {/* HEADER */}
      <div className="dashboard-header">
        <div>
          <span className="dashboard-eyebrow">Haroon Stores Admin</span>
          <h1>Dashboard Overview</h1>
          <p>Real-time store metrics, fulfillment progress, and catalog status</p>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="stats-grid">
        {statCards.map(card => (
          <div
            key={card.label}
            className={card.onClick ? "stat-card stat-card-clickable" : "stat-card"}
            role={card.onClick ? "button" : undefined}
            tabIndex={card.onClick ? "0" : undefined}
            onClick={card.onClick}
            onKeyDown={card.onClick ? (event) => handleCardKey(event, card.onClick) : undefined}
            style={{ borderLeftColor: card.accent }}
          >
            <div className="stat-card-top">
              <span className="stat-icon" style={{ color: card.accent }}>
                {card.icon}
              </span>
              <span className="stat-label">{card.label}</span>
            </div>
            <h2 className="stat-value">{isLoading ? "—" : card.value}</h2>
            {card.subtext && <p className="stat-subtext">{card.subtext}</p>}
          </div>
        ))}
      </div>

      {/* QUICK ACTIONS */}
      <div className="admin-section-block">
        <h2 className="admin-section-title">Quick Actions</h2>
        <div className="quick-actions">
          {quickActions.map(action => (
            <div
              key={action.label}
              className="quick-card"
              onClick={action.onClick}
              role="button"
              tabIndex="0"
              onKeyDown={(event) => handleCardKey(event, action.onClick)}
            >
              <span className="quick-icon">{action.icon}</span>
              <div className="quick-info">
                <h3>{action.label}</h3>
                <p>{action.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LOW STOCK ALERT (if any) */}
      {lowStockProducts.length > 0 && (
        <div className="admin-alert-banner">
          <FaExclamationTriangle className="admin-alert-icon" />
          <div className="admin-alert-text">
            <strong>Stock Alert:</strong> {lowStockProducts.length} product(s) have low stock or are marked out of stock.
          </div>
          <button
            type="button"
            className="admin-alert-link"
            onClick={() => navigate("/admin/products")}
          >
            Review Stock →
          </button>
        </div>
      )}

      {/* RECENT ORDERS TABLE */}
      <div className="admin-section-block">
        <div className="admin-section-header">
          <div>
            <h2 className="admin-section-title">Recent Orders</h2>
            <p className="admin-section-subtitle">Showing latest order activity</p>
          </div>
          <button
            type="button"
            className="admin-view-all-btn"
            onClick={() => navigate("/admin/orders")}
          >
            View All Orders <FaArrowRight />
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="admin-empty-table-box">
            <p>No orders placed yet.</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-recent-table">
              <thead>
                <tr>
                  <th>Order Code</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => {
                  const statusKey = String(order.status || "")
                    .toLowerCase()
                    .replace(/\s+/g, "-");

                  return (
                    <tr key={order.id}>
                      <td className="admin-order-code">#{order.id}</td>
                      <td className="admin-order-date">
                        {order.date ? new Date(order.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        }) : "—"}
                      </td>
                      <td className="admin-order-customer">
                        <strong>{order.customer || "Guest"}</strong>
                        {order.phone && <span className="admin-table-subtext">{order.phone}</span>}
                      </td>
                      <td className="admin-order-payment">
                        <span className={`admin-mode-pill admin-mode-pill--${String(order.paymentMode).toLowerCase()}`}>
                          {order.paymentMode || "Online"}
                        </span>
                        {order.paymentMode === "COD" && order.remaining > 0 && (
                          <span className="admin-table-subtext">Due: ₹{order.remaining}</span>
                        )}
                      </td>
                      <td className="admin-order-amount">
                        <strong>₹{Number(order.total || 0).toLocaleString()}</strong>
                      </td>
                      <td>
                        <span className={`status-badge ${statusKey}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-table-action-btn"
                          onClick={() => navigate(`/admin/orders?search=${encodeURIComponent(order.id)}`)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;

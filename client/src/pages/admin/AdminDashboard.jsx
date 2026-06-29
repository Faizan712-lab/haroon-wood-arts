import "./Admin.css";

import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  FaBoxOpen,
  FaChartLine,
  FaClipboardList,
  FaFolderOpen,
  FaPlusCircle,
  FaShoppingBag,
  FaTruck,
  FaWallet
} from "react-icons/fa";

import { getApiUrl } from "../../utils/api";

function AdminDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const ordersResponse = await fetch(getApiUrl("/api/orders"), {
          credentials: "include",
          cache: "no-store"
        });
        const ordersData = await ordersResponse.json();

        setOrders(
          ordersResponse.ok && ordersData.success
            ? ordersData.orders || []
            : []
        );

        const response = await fetch(getApiUrl("/api/products"), {
          cache: "no-store"
        });
        const data = await response.json();

        setProducts(response.ok && data.success ? data.products || [] : []);
      } catch {
        setOrders([]);
        setProducts([]);
      }
    }

    loadDashboardData();
  }, []);

  const revenue = orders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  const deliveredOrders = orders.filter(order => order.status === "Delivered").length;

  const pendingOrders = orders.filter(order =>
    !["Delivered", "Cancelled", "Refund Completed"].includes(order.status)
  ).length;

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
      icon: <FaClipboardList />,
      onClick: () => navigate("/admin/orders")
    },
    {
      label: "Total Products",
      value: products.length,
      icon: <FaShoppingBag />,
      onClick: () => navigate("/admin/products")
    },
    {
      label: "Revenue",
      value: `Rs. ${revenue.toLocaleString()}`,
      icon: <FaWallet />
    },
    {
      label: "Delivered Orders",
      value: deliveredOrders,
      icon: <FaTruck />,
      onClick: () => openOrderStatus("Delivered")
    },
    {
      label: "Pending Orders",
      value: pendingOrders,
      icon: <FaChartLine />,
      onClick: () => openOrderStatus("Processing")
    }
  ];

  const quickActions = [
    {
      label: "Manage Orders",
      icon: <FaBoxOpen />,
      onClick: () => navigate("/admin/orders")
    },
    {
      label: "Add Product",
      icon: <FaPlusCircle />,
      onClick: () => navigate("/admin/add-product")
    },
    {
      label: "Manage Categories",
      icon: <FaFolderOpen />,
      onClick: () => navigate("/admin/categories")
    },
    {
      label: "View Products",
      icon: <FaShoppingBag />,
      onClick: () => navigate("/admin/products")
    }
  ];

  return (
    <div className="admin-dashboard-content">
      <div className="dashboard-header">
        <div>
          <h1>Haroon Stores</h1>
          <p>Your Dashboard</p>
        </div>
      </div>

      <div className="stats-grid">
        {statCards.map(card => (
          <div
            key={card.label}
            className={card.onClick ? "stat-card stat-card-clickable" : "stat-card"}
            role={card.onClick ? "button" : undefined}
            tabIndex={card.onClick ? "0" : undefined}
            onClick={card.onClick}
            onKeyDown={
              card.onClick
                ? (event) => handleCardKey(event, card.onClick)
                : undefined
            }
          >
            <span className="stat-icon">{card.icon}</span>
            <h3>{card.label}</h3>
            <h2>{card.value}</h2>
          </div>
        ))}
      </div>

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
            <span>{action.icon}</span>
            <p>{action.label}</p>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="admin-empty-box">
          <h3>No Products Added Yet</h3>
          <p>Start adding products to your store.</p>
          <button className="empty-btn" onClick={() => navigate("/admin/add-product")}>
            Add First Product
          </button>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;

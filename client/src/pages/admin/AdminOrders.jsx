import "./Admin.css";

import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  FaBox,
  FaCalendarAlt,
  FaCheck,
  FaChevronDown,
  FaChevronUp,
  FaCreditCard,
  FaFilter,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaPhone,
  FaSearch,
  FaTimes,
  FaTruck,
  FaUndo,
  FaUser
} from "react-icons/fa";

import { getApiUrl } from "../../utils/api";
import { PRODUCT_PLACEHOLDER, handleImageFallback } from "../../utils/imageFallback";

function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search input state
  const urlSearch = searchParams.get("search") || "";
  const [orderSearch, setOrderSearch] = useState(urlSearch);
  const [activeOrderSearch, setActiveOrderSearch] = useState(urlSearch);

  // Status & payment filter state
  const statusFilter = normaliseStatus(searchParams.get("status") || "all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  // Expanded items state by order ID: { [orderId]: boolean }
  const [expandedOrders, setExpandedOrders] = useState({});

  // Pickup scheduling state
  const [pickupDate, setPickupDate] = useState({});
  const [pickupTime, setPickupTime] = useState({});
  const [updatingAction, setUpdatingAction] = useState("");

  const ordersRef = useRef([]);

  function normaliseStatus(status) {
    return (status || "")
      .toLowerCase()
      .trim()
      .replace(/-+/g, " ")
      .replace(/\s+/g, " ");
  }

  /* LOAD ORDERS */
  async function loadOrders() {
    try {
      setIsLoading(true);
      const response = await fetch(getApiUrl("/api/orders"), {
        credentials: "include",
        cache: "no-store"
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load orders");
      }

      const fixedOrders = (data.orders || []).map(order => ({
        ...order,
        status: order.status || "Processing",
        paymentMode: order.paymentMode || order.payment || "COD",
        items: Array.isArray(order.items) ? order.items : []
      }));

      setOrders(fixedOrders);
      ordersRef.current = fixedOrders;
    } catch (error) {
      console.error("Failed to load orders:", error);
      setOrders([]);
      ordersRef.current = [];
      toast.error("Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // Sync state if URL searchParam changes
  useEffect(() => {
    const currentUrlSearch = searchParams.get("search") || "";
    if (currentUrlSearch !== activeOrderSearch) {
      setOrderSearch(currentUrlSearch);
      setActiveOrderSearch(currentUrlSearch);
    }
  }, [searchParams]);

  function updateOrderInState(updatedOrder) {
    const updatedOrders = ordersRef.current.map(order =>
      String(order.id) === String(updatedOrder.id)
        ? {
            ...order,
            ...updatedOrder,
            items: updatedOrder.items || order.items
          }
        : order
    );
    setOrders(updatedOrders);
    ordersRef.current = updatedOrders;
  }

  async function patchOrder(orderId, path, body) {
    const response = await fetch(getApiUrl(`/api/orders/${orderId}${path}`), {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {})
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to update order");
    }

    updateOrderInState(data.order);
    return data.order;
  }

  /* STATUS TRANSITIONS */
  async function updateStatus(orderId, value) {
    const actionKey = `${orderId}:status`;
    if (updatingAction) return;

    try {
      setUpdatingAction(actionKey);

      if (value === "Return Completed") {
        await patchOrder(orderId, "/return-completed");
        toast.success("Order marked as Return Completed");
        return;
      }

      await patchOrder(orderId, "/status", { status: value });
      toast.success(`Order status updated to ${value}`);
    } catch (error) {
      toast.error(error.message || "Error updating order");
    } finally {
      setUpdatingAction("");
    }
  }

  async function approveCancel(orderId) {
    const actionKey = `${orderId}:approve-cancel`;
    try {
      setUpdatingAction(actionKey);
      await patchOrder(orderId, "/cancel-approve");
      toast.success("Order cancellation approved");
    } catch (error) {
      toast.error(error.message || "Error approving cancellation");
    } finally {
      setUpdatingAction("");
    }
  }

  async function rejectCancel(orderId) {
    const actionKey = `${orderId}:reject-cancel`;
    try {
      setUpdatingAction(actionKey);
      await patchOrder(orderId, "/cancel-reject");
      toast.success("Order cancellation rejected");
    } catch (error) {
      toast.error(error.message || "Error rejecting cancellation");
    } finally {
      setUpdatingAction("");
    }
  }

  async function approveReturn(orderId) {
    const date = pickupDate[String(orderId)];
    const time = pickupTime[String(orderId)];

    if (!date || !time) {
      toast.error("Please select pickup date and time");
      return;
    }

    try {
      setUpdatingAction(`${orderId}:approve-return`);
      await patchOrder(orderId, "/return-approve", {
        pickupDate: date,
        pickupTime: time
      });
      toast.success("Return pickup scheduled successfully");
    } catch (error) {
      toast.error(error.message || "Error scheduling pickup");
    } finally {
      setUpdatingAction("");
    }
  }

  async function rejectReturn(orderId) {
    const actionKey = `${orderId}:reject-return`;
    try {
      setUpdatingAction(actionKey);
      await patchOrder(orderId, "/return-reject");
      toast.success("Return request rejected");
    } catch (error) {
      toast.error(error.message || "Error rejecting return");
    } finally {
      setUpdatingAction("");
    }
  }

  async function markPickupCompleted(orderId) {
    try {
      setUpdatingAction(`${orderId}:pickup-completed`);
      await patchOrder(orderId, "/pickup-completed");
      toast.success("Pickup marked completed");
    } catch (error) {
      toast.error(error.message || "Error completing pickup");
    } finally {
      setUpdatingAction("");
    }
  }

  async function completeReturn(orderId) {
    try {
      setUpdatingAction(`${orderId}:return-completed`);
      await patchOrder(orderId, "/return-completed");
      toast.success("Return completed successfully");
    } catch (error) {
      toast.error(error.message || "Error completing return");
    } finally {
      setUpdatingAction("");
    }
  }

  async function completeRefund(orderId) {
    try {
      setUpdatingAction(`${orderId}:refund-completed`);
      await patchOrder(orderId, "/refund-completed");
      toast.success("Refund marked completed");
    } catch (error) {
      toast.error(error.message || "Error completing refund");
    } finally {
      setUpdatingAction("");
    }
  }

  const hiddenStatuses = [
    "payment pending",
    "payment expired",
    "cancellation requested",
    "return requested",
    "pickup scheduled",
    "pickup completed",
    "return completed",
    "refund completed"
  ];

  function shouldHideDropdown(status) {
    return hiddenStatuses.includes(normaliseStatus(status));
  }

  function toggleOrderItems(orderId) {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    const query = orderSearch.trim();
    setActiveOrderSearch(query);
    const newParams = new URLSearchParams(searchParams);
    if (query) {
      newParams.set("search", query);
    } else {
      newParams.delete("search");
    }
    setSearchParams(newParams);
  }

  function handleClearFilters() {
    setOrderSearch("");
    setActiveOrderSearch("");
    setPaymentFilter("all");
    setSearchParams({});
  }

  function handleStatusTabSelect(tabKey) {
    const newParams = new URLSearchParams(searchParams);
    if (tabKey === "all") {
      newParams.delete("status");
    } else {
      newParams.set("status", tabKey);
    }
    setSearchParams(newParams);
  }

  // Filter calculations
  const returnStatuses = [
    "cancellation requested",
    "return requested",
    "pickup scheduled",
    "pickup completed",
    "return completed",
    "refund completed"
  ];

  const filteredOrders = orders.filter(order => {
    const q = activeOrderSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      String(order.id || "").toLowerCase().includes(q) ||
      String(order.customer || "").toLowerCase().includes(q) ||
      String(order.phone || "").toLowerCase().includes(q);

    const orderNormStatus = normaliseStatus(order.status);
    let matchesStatus = true;
    if (statusFilter && statusFilter !== "all") {
      if (statusFilter === "requests") {
        matchesStatus = returnStatuses.includes(orderNormStatus);
      } else {
        matchesStatus = orderNormStatus === statusFilter;
      }
    }

    let matchesPayment = true;
    if (paymentFilter !== "all") {
      matchesPayment = String(order.paymentMode || "").toUpperCase() === paymentFilter.toUpperCase();
    }

    return matchesSearch && matchesStatus && matchesPayment;
  });

  // Tab count badges
  const countAll = orders.length;
  const countProcessing = orders.filter(o => normaliseStatus(o.status) === "processing").length;
  const countShipped = orders.filter(o => normaliseStatus(o.status) === "shipped").length;
  const countDelivered = orders.filter(o => normaliseStatus(o.status) === "delivered").length;
  const countRequests = orders.filter(o => returnStatuses.includes(normaliseStatus(o.status))).length;
  const countCancelled = orders.filter(o => normaliseStatus(o.status) === "cancelled").length;

  return (
    <div className="admin-page admin-orders-page">
      {/* HEADER */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Manage Orders</h1>
          <p className="admin-page-subtitle">
            Order processing, customer fulfillment, and returns lifecycle
          </p>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="admin-status-tabs">
        <button
          type="button"
          className={`admin-tab-btn ${(!statusFilter || statusFilter === "all") ? "active" : ""}`}
          onClick={() => handleStatusTabSelect("all")}
        >
          All Orders <span className="admin-tab-badge">{countAll}</span>
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${statusFilter === "processing" ? "active" : ""}`}
          onClick={() => handleStatusTabSelect("Processing")}
        >
          Processing <span className="admin-tab-badge">{countProcessing}</span>
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${statusFilter === "shipped" ? "active" : ""}`}
          onClick={() => handleStatusTabSelect("Shipped")}
        >
          Shipped <span className="admin-tab-badge">{countShipped}</span>
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${statusFilter === "delivered" ? "active" : ""}`}
          onClick={() => handleStatusTabSelect("Delivered")}
        >
          Delivered <span className="admin-tab-badge">{countDelivered}</span>
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${statusFilter === "requests" ? "active" : ""}`}
          onClick={() => handleStatusTabSelect("requests")}
        >
          Requests & Returns <span className="admin-tab-badge">{countRequests}</span>
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${statusFilter === "cancelled" ? "active" : ""}`}
          onClick={() => handleStatusTabSelect("Cancelled")}
        >
          Cancelled <span className="admin-tab-badge">{countCancelled}</span>
        </button>
      </div>

      {/* CONTROLS BAR: SEARCH & PAYMENT FILTER */}
      <div className="admin-order-controls-bar">
        <form className="admin-search-box-form" onSubmit={handleSearchSubmit}>
          <FaSearch className="admin-search-input-icon" />
          <input
            id="admin-order-search-input"
            type="text"
            placeholder="Search by Order ID, Customer name, Phone..."
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
          />
          {orderSearch && (
            <button
              type="button"
              className="admin-search-clear-inline"
              onClick={() => {
                setOrderSearch("");
                setActiveOrderSearch("");
                const newParams = new URLSearchParams(searchParams);
                newParams.delete("search");
                setSearchParams(newParams);
              }}
            >
              <FaTimes />
            </button>
          )}
          <button className="admin-search-btn" type="submit">
            Search
          </button>
        </form>

        <div className="admin-payment-filter-wrapper">
          <label htmlFor="admin-payment-filter" className="admin-filter-label">
            <FaFilter /> Payment:
          </label>
          <select
            id="admin-payment-filter"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="admin-select-filter"
          >
            <option value="all">All Modes</option>
            <option value="Online">Pay Online</option>
            <option value="COD">Cash on Delivery (COD)</option>
          </select>
        </div>

        {(activeOrderSearch || (statusFilter && statusFilter !== "all") || paymentFilter !== "all") && (
          <button
            type="button"
            className="admin-clear-all-filters-btn"
            onClick={handleClearFilters}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* ORDER LISTING */}
      {isLoading ? (
        <div className="admin-loading-card">
          <p>Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="admin-empty-box">
          <h2>No Orders Found</h2>
          <p>Orders placed by customers will appear here.</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="admin-empty-box">
          <h2>No Matching Orders</h2>
          <p>No orders match the current search or status filter.</p>
          <button type="button" className="empty-btn" onClick={handleClearFilters}>
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="admin-orders-list">
          {filteredOrders.map(order => {
            const isExpanded = Boolean(expandedOrders[order.id]);
            const statusKey = normaliseStatus(order.status).replace(/\s+/g, "-");
            const isCod = String(order.paymentMode).toUpperCase() === "COD";

            return (
              <div className="admin-order-card" key={String(order.id)}>
                {/* HEADER */}
                <div className="order-header">
                  <div className="order-header-left">
                    <h2 className="order-id">#{order.id}</h2>
                    <span className="order-date">
                      <FaCalendarAlt className="inline-icon" />{" "}
                      {order.date
                        ? new Date(order.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                        : order.createdAt || "—"}
                    </span>
                  </div>

                  <div className="order-header-right">
                    <span className={`status-badge ${statusKey}`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* INFO GRID */}
                <div className="order-info-grid">
                  <div className="order-info-box">
                    <span className="order-info-label">
                      <FaUser className="inline-icon" /> Customer
                    </span>
                    <strong className="order-info-val">{order.customer || "Guest"}</strong>
                  </div>

                  <div className="order-info-box">
                    <span className="order-info-label">
                      <FaPhone className="inline-icon" /> Phone
                    </span>
                    <strong className="order-info-val">{order.phone || "—"}</strong>
                  </div>

                  <div className="order-info-box">
                    <span className="order-info-label">
                      <FaCreditCard className="inline-icon" /> Payment Mode
                    </span>
                    <strong className="order-info-val">
                      <span className={`admin-mode-pill admin-mode-pill--${String(order.paymentMode).toLowerCase()}`}>
                        {order.paymentMode || "Online"}
                      </span>
                    </strong>
                  </div>

                  <div className="order-info-box">
                    <span className="order-info-label">
                      <FaMoneyBillWave className="inline-icon" /> Total Amount
                    </span>
                    <strong className="order-info-val order-info-val--highlight">
                      ₹{Number(order.total || 0).toLocaleString()}
                    </strong>
                  </div>
                </div>

                {/* PAYMENT BREAKDOWN BANNER */}
                <div className="order-payment-breakdown">
                  {isCod ? (
                    <div className="order-breakdown-row">
                      <span className="breakdown-item">
                        Advance Paid Online: <strong>₹{Number(order.paid || order.codAdvance || 0).toLocaleString()}</strong> (10%)
                      </span>
                      <span className="breakdown-separator">•</span>
                      <span className="breakdown-item breakdown-item--due">
                        Due On Delivery: <strong>₹{Number(order.remaining || order.codRemainingOnDelivery || 0).toLocaleString()}</strong> (90%)
                      </span>
                    </div>
                  ) : (
                    <div className="order-breakdown-row">
                      <span className="breakdown-item breakdown-item--success">
                        Full Amount Paid Online: <strong>₹{Number(order.paid || order.total || 0).toLocaleString()}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* ADDRESS */}
                <div className="order-address">
                  <span className="order-info-label">
                    <FaMapMarkerAlt className="inline-icon" /> Delivery Address
                  </span>
                  <p>{order.address || "Address not provided"}</p>
                </div>

                {/* ORDER ITEMS SECTION (EXPANDABLE) */}
                <div className="order-items-wrapper">
                  <button
                    type="button"
                    className="order-items-toggle-btn"
                    onClick={() => toggleOrderItems(order.id)}
                  >
                    <span>
                      <FaBox className="inline-icon" /> Ordered Items ({order.items?.length || 0})
                    </span>
                    {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                  </button>

                  {isExpanded && (
                    <div className="order-items-table-container">
                      {order.items?.length === 0 ? (
                        <p className="order-items-empty">No item snapshots recorded for this order.</p>
                      ) : (
                        <table className="order-items-table">
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th>Variant / Size</th>
                              <th>Qty</th>
                              <th>Unit Price</th>
                              <th>Line Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items.map((item, idx) => (
                              <tr key={item.orderItemId || item.id || idx}>
                                <td className="order-item-product-cell">
                                  <img
                                    src={item.image || PRODUCT_PLACEHOLDER}
                                    alt={item.name || "Product"}
                                    className="order-item-thumb"
                                    onError={handleImageFallback}
                                  />
                                  <span className="order-item-name">{item.name}</span>
                                </td>
                                <td className="order-item-variant">
                                  {item.variantLabel || item.variantDimensions
                                    ? [item.variantLabel, item.variantDimensions].filter(Boolean).join(" · ")
                                    : "Standard"}
                                </td>
                                <td>{item.quantity}</td>
                                <td>₹{Number(item.price || 0).toLocaleString()}</td>
                                <td>
                                  <strong>
                                    ₹{Number(item.lineTotal || (item.quantity * item.price) || 0).toLocaleString()}
                                  </strong>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>

                {/* DELIVERY & RETURN AUDIT NOTES */}
                {order.deliveredDate && (
                  <div className="admin-delivery-info">
                    ✅ Delivered On: <strong>{order.deliveredDate}</strong>
                  </div>
                )}
                {order.returnCompletedDate && (
                  <div className="admin-refund-info">
                    Return Completed On: <strong>{order.returnCompletedDate}</strong>
                  </div>
                )}
                {order.refundCompletedDate && (
                  <div className="admin-refund-info">
                    💰 Refund Completed On: <strong>{order.refundCompletedDate}</strong>
                  </div>
                )}

                {/* CANCELLATION REQUEST FLOW */}
                {normaliseStatus(order.status) === "cancellation requested" && (
                  <div className="cancel-request-box">
                    <h3>Cancellation Request</h3>
                    <p>
                      <strong>Reason: </strong>
                      {order.cancellationReason || "Customer requested cancellation"}
                    </p>
                    <div className="cancel-admin-actions">
                      <button
                        type="button"
                        className="approve-btn"
                        onClick={() => approveCancel(String(order.id))}
                        disabled={Boolean(updatingAction)}
                      >
                        {updatingAction === `${order.id}:approve-cancel` ? "Updating..." : "Approve Cancellation"}
                      </button>
                      <button
                        type="button"
                        className="reject-btn"
                        onClick={() => rejectCancel(String(order.id))}
                        disabled={Boolean(updatingAction)}
                      >
                        {updatingAction === `${order.id}:reject-cancel` ? "Updating..." : "Reject Cancellation"}
                      </button>
                    </div>
                  </div>
                )}

                {/* RETURN REQUEST FLOW */}
                {normaliseStatus(order.status) === "return requested" && (
                  <div className="return-request-box">
                    <h3>Return Request</h3>
                    <p>
                      <strong>Reason: </strong>
                      {order.returnReason || "Customer requested return"}
                    </p>
                    {order.returnImage && (
                      <div className="return-proof-wrapper">
                        <h4>Uploaded Product Proof</h4>
                        <img src={order.returnImage} alt="Return Proof" className="return-proof-image" />
                      </div>
                    )}
                    <div className="pickup-schedule">
                      <label>Schedule Pickup Date & Time:</label>
                      <div className="pickup-inputs-row">
                        <input
                          type="date"
                          value={pickupDate[String(order.id)] || ""}
                          onChange={(e) =>
                            setPickupDate({
                              ...pickupDate,
                              [String(order.id)]: e.target.value
                            })
                          }
                        />
                        <input
                          type="time"
                          value={pickupTime[String(order.id)] || ""}
                          onChange={(e) =>
                            setPickupTime({
                              ...pickupTime,
                              [String(order.id)]: e.target.value
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="cancel-admin-actions">
                      <button
                        type="button"
                        className="approve-btn"
                        onClick={() => approveReturn(String(order.id))}
                        disabled={Boolean(updatingAction)}
                      >
                        {updatingAction === `${order.id}:approve-return` ? "Updating..." : "Schedule Pickup"}
                      </button>
                      <button
                        type="button"
                        className="reject-btn"
                        onClick={() => rejectReturn(String(order.id))}
                        disabled={Boolean(updatingAction)}
                      >
                        {updatingAction === `${order.id}:reject-return` ? "Updating..." : "Reject Return"}
                      </button>
                    </div>
                  </div>
                )}

                {/* PICKUP SCHEDULED */}
                {normaliseStatus(order.status) === "pickup scheduled" && (
                  <div className="cancel-request-box">
                    <h3>Pickup Scheduled</h3>
                    <p><strong>Pickup Date:</strong> {order.pickupDate || "—"}</p>
                    <p><strong>Pickup Time:</strong> {order.pickupTime || "—"}</p>
                    <button
                      type="button"
                      className="approve-btn"
                      onClick={() => markPickupCompleted(String(order.id))}
                      disabled={Boolean(updatingAction)}
                    >
                      {updatingAction === `${order.id}:pickup-completed` ? "Updating..." : "Mark Pickup Completed"}
                    </button>
                  </div>
                )}

                {/* PICKUP COMPLETED */}
                {normaliseStatus(order.status) === "pickup completed" && (
                  <div className="cancel-request-box">
                    <h3>Return Pickup Completed</h3>
                    <p>Customer product has been picked up.</p>
                    {order.refundDate && <p>Expected refund by: <strong>{order.refundDate}</strong></p>}
                    <button
                      type="button"
                      className="approve-btn"
                      onClick={() => completeReturn(String(order.id))}
                      disabled={Boolean(updatingAction)}
                    >
                      {updatingAction === `${order.id}:return-completed` ? "Updating..." : "Mark Return Completed"}
                    </button>
                  </div>
                )}

                {/* RETURN COMPLETED */}
                {normaliseStatus(order.status) === "return completed" && (
                  <div className="cancel-request-box">
                    <h3>Refund Processing</h3>
                    <p>Return has been completed successfully.</p>
                    {order.refundDate && <p>Expected refund by: <strong>{order.refundDate}</strong></p>}
                    <button
                      type="button"
                      className="approve-btn"
                      onClick={() => completeRefund(String(order.id))}
                      disabled={Boolean(updatingAction)}
                    >
                      {updatingAction === `${order.id}:refund-completed` ? "Updating..." : "Complete Refund"}
                    </button>
                  </div>
                )}

                {/* STANDARD STATUS UPDATE DROPDOWN */}
                {!shouldHideDropdown(order.status) && (
                  <div className="status-update">
                    <label htmlFor={`status-select-${order.id}`}>Update Order Status</label>
                    <select
                      id={`status-select-${order.id}`}
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      className="status-dropdown"
                      disabled={Boolean(updatingAction)}
                    >
                      <option value="Processing">Processing</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Return Completed">Return Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminOrders;

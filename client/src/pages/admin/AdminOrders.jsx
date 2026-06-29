import "./Admin.css";

import {
  useNavigate,
  useSearchParams
}
from "react-router-dom";

import {
  useEffect,
  useRef,
  useState
}
from "react";

import toast from "react-hot-toast";

import {
  getApiUrl
}
from "../../utils/api";

function AdminOrders() {

  const [searchParams] =
    useSearchParams();

  const navigate =
    useNavigate();

  const [orders, setOrders] =
    useState([]);

  const [orderSearch,
    setOrderSearch] =
    useState("");

  const [activeOrderSearch,
    setActiveOrderSearch] =
    useState("");

  const statusFilter =
    normaliseStatus(
      searchParams.get("status")
    );

  const statusFilterLabel =
    searchParams.get("status") || "";

  const [pickupDate,
    setPickupDate] =
    useState({});

  const [pickupTime,
    setPickupTime] =
    useState({});

  const [updatingAction,
    setUpdatingAction] =
    useState("");

  /* REF */

  const ordersRef =
    useRef([]);

  /* ================= NORMALISE ================= */

  function normaliseStatus(status) {

    return (status || "")

      .toLowerCase()

      .trim()

      .replace(/-+/g, " ")

      .replace(/\s+/g, " ");

  }

  /* ================= LOAD ================= */

  async function loadOrders() {

    try {

      const response =
        await fetch(
          getApiUrl("/api/orders"),
          {
            credentials: "include",
            cache: "no-store"
          }
        );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
          "Failed to load orders"
        );
      }

      const fixedOrders =

        (data.orders || []).map(order => ({

          ...order,
          status:
            order.status ||
            "Processing",
          paymentMode:
            order.paymentMode ||
            order.payment ||
            "COD"

        }));

      setOrders(fixedOrders);

      ordersRef.current =
        fixedOrders;

    }

    catch {

      setOrders([]);

      ordersRef.current = [];

    }

  }

  useEffect(() => {

    loadOrders();

  }, []);

  useEffect(() => {

    ordersRef.current =
      orders;

  }, [orders]);

  /* ================= SAVE ================= */

  function updateOrderInState(updatedOrder) {

    const updatedOrders =
      ordersRef.current.map(order =>
        String(order.id) === String(updatedOrder.id)
          ? updatedOrder
          : order
      );

    setOrders(updatedOrders);

    ordersRef.current =
      updatedOrders;

  }

  async function patchOrder(
    orderId,
    path,
    body
  ) {

    const response =
      await fetch(
        getApiUrl(`/api/orders/${orderId}${path}`),
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json"
          },
          body:
            JSON.stringify(body || {})
        }
      );

    const data =
      await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
        "Failed to update order"
      );
    }

    updateOrderInState(data.order);

    return data.order;

  }

  /* ================= UPDATE STATUS ================= */

  async function updateStatus(
  orderId,
  value
) {
  const actionKey = `${orderId}:status`;

  if (updatingAction) {
    return;
  }

  try {
    setUpdatingAction(actionKey);

    if (value === "Return Completed") {
      await patchOrder(
        orderId,
        "/return-completed"
      );
      toast.success("Order updated successfully");
      return;
    }

    await patchOrder(
      orderId,
      "/status",
      { status: value }
    );
    toast.success("Order updated successfully");

  } catch (error) {

    toast.error(error.message || "Error updating order");

  } finally {
    setUpdatingAction("");

  }

}
  /* ================= APPROVE CANCEL ================= */

  async function approveCancel(orderId) {
    const actionKey = `${orderId}:approve-cancel`;

    try {
      setUpdatingAction(actionKey);
      await patchOrder(
        orderId,
        "/cancel-approve"
      );
      toast.success("Order updated successfully");
    } catch (error) {
      toast.error(error.message || "Error updating order");
    } finally {
      setUpdatingAction("");
    }

  }

  /* ================= REJECT CANCEL ================= */

  async function rejectCancel(orderId) {
    const actionKey = `${orderId}:reject-cancel`;

    try {
      setUpdatingAction(actionKey);
      await patchOrder(
        orderId,
        "/cancel-reject"
      );
      toast.success("Order updated successfully");
    } catch (error) {
      toast.error(error.message || "Error updating order");
    } finally {
      setUpdatingAction("");
    }

  }

  /* ================= APPROVE RETURN ================= */

  async function approveReturn(orderId) {

    if (

      !pickupDate[
        String(orderId)
      ] ||

      !pickupTime[
        String(orderId)
      ]

    ) {

      toast.error(
        "Please select pickup date and time"
      );

      return;

    }

    try {
      setUpdatingAction(`${orderId}:approve-return`);

      await patchOrder(
        orderId,
        "/return-approve",
        {
          pickupDate:
            pickupDate[
              String(orderId)
            ],
          pickupTime:
            pickupTime[
              String(orderId)
            ]
        }
      );
      toast.success("Pickup scheduled successfully");

    } catch (error) {

      toast.error(error.message || "Error updating order");

    } finally {
      setUpdatingAction("");

    }

  }

  /* ================= REJECT RETURN ================= */

  async function rejectReturn(orderId) {
    const actionKey = `${orderId}:reject-return`;

    try {
      setUpdatingAction(actionKey);
      await patchOrder(
        orderId,
        "/return-reject"
      );
      toast.success("Order updated successfully");
    } catch (error) {
      toast.error(error.message || "Error updating order");
    } finally {
      setUpdatingAction("");
    }

  }

  /* ================= PICKUP COMPLETED ================= */

  async function markPickupCompleted(
    orderId
  ) {
    try {
      setUpdatingAction(`${orderId}:pickup-completed`);
      await patchOrder(
        orderId,
        "/pickup-completed"
      );
      toast.success("Pickup completed successfully");
    } catch (error) {
      toast.error(error.message || "Error updating order");
    } finally {
      setUpdatingAction("");
    }

  }

  /* ================= COMPLETE RETURN ================= */

  async function completeReturn(
    orderId
  ) {
    try {
      setUpdatingAction(`${orderId}:return-completed`);
      await patchOrder(
        orderId,
        "/return-completed"
      );
      toast.success("Order updated successfully");
    } catch (error) {
      toast.error(error.message || "Error updating order");
    } finally {
      setUpdatingAction("");
    }

  }

  /* ================= COMPLETE REFUND ================= */

  async function completeRefund(
    orderId
  ) {
    try {
      setUpdatingAction(`${orderId}:refund-completed`);
      await patchOrder(
        orderId,
        "/refund-completed"
      );
      toast.success("Refund completed successfully");
    } catch (error) {
      toast.error(error.message || "Error updating order");
    } finally {
      setUpdatingAction("");
    }

  }

  /* ================= DROPDOWN HIDE ================= */

  const hiddenStatuses = [

    "cancellation requested",

    "return requested",

    "pickup scheduled",

    "pickup completed",

    "return completed",

    "refund completed"

  ];

  function shouldHideDropdown(
    status
  ) {

    return hiddenStatuses.includes(

      normaliseStatus(status)

    );

  }

  const filteredOrders =

    orders.filter(order => {

      const matchesSearch =
        String(order.id)
          .toLowerCase()
          .includes(
            activeOrderSearch
              .trim()
              .toLowerCase()
          );

      const matchesStatus =
        !statusFilter ||
        normaliseStatus(order.status) ===
        statusFilter;

      return matchesSearch && matchesStatus;

    });

  return (

    <div className="admin-orders">

      <h1>
        📦 Manage Orders
      </h1>

      {statusFilter && (
        <div className="admin-status-message">
          <span>
            Showing:
            {" "}
            {statusFilterLabel}
          </span>

          <button
            type="button"
            onClick={() =>
              navigate("/admin/orders")
            }
          >
            Clear filter
          </button>
        </div>
      )}

      <div className="admin-order-search">

        <div>

          <label htmlFor="admin-order-search-input">
            Search Order ID
          </label>

          <input
            id="admin-order-search-input"
            type="text"
            placeholder="Enter order id..."
            value={orderSearch}
            onChange={(e) =>
              setOrderSearch(
                e.target.value
              )
            }
          />

        </div>

        <button
          className="admin-search-btn"
          type="button"
          onClick={() =>
            setActiveOrderSearch(
              orderSearch.trim()
            )
          }
        >
          Search
        </button>

        <button
          className="admin-clear-btn"
          type="button"
          onClick={() => {
            setOrderSearch("");
            setActiveOrderSearch("");
            if (statusFilter) {
              navigate("/admin/orders");
            }
          }}
          disabled={
            !orderSearch &&
            !activeOrderSearch &&
            !statusFilter
          }
        >
          Clear
        </button>

      </div>

      {orders.length === 0 ? (

        <div className="empty-orders">

          <h2>
            No Orders Yet
          </h2>

        </div>

      ) : (

        filteredOrders.length === 0 ? (

          <div className="empty-orders">

            <h2>
              No matching orders
            </h2>

          </div>

        ) : (

        filteredOrders.map((order) => (

          <div

            className="admin-order-card"

            key={String(order.id)}

          >

            {/* HEADER */}

            <div className="order-header">

              <div>

                <h2 className="order-id">

                  #{order.id}

                </h2>

                <p className="order-date">

                  {order.date}

                </p>

              </div>

              <div

                className={`status-badge ${normaliseStatus(
                  order.status
                ).replaceAll(" ", "-")}`}

              >

                {order.status}

              </div>

            </div>

            {/* INFO */}

            <div className="order-info-grid">

              <div className="order-info-box">

                <span>
                  Customer
                </span>

                <h3>
                  {order.customer}
                </h3>

              </div>

              <div className="order-info-box">

                <span>
                  Phone
                </span>

                <h3>
                  {order.phone}
                </h3>

              </div>

              <div className="order-info-box">

                <span>
                  Payment
                </span>

                <h3>
                  {order.paymentMode}
                </h3>

              </div>

              <div className="order-info-box">

                <span>
                  Total
                </span>

                <h3>
                  ₹ {order.total}
                </h3>

              </div>

            </div>

            {/* ADDRESS */}

            <div className="order-address">

              <span>
                Delivery Address
              </span>

              <p>
                {order.address}
              </p>

            </div>

            {/* DELIVERY INFO */}

            {order.deliveredDate && (

              <div className="admin-delivery-info">

                ✅ Delivered On:
                {" "}
                <strong>

                  {order.deliveredDate}

                </strong>

              </div>

            )}

            {/* RETURN INFO */}

            {order.returnCompletedDate && (

              <div className="admin-refund-info">

                Return Completed On:
                {" "}
                <strong>

                  {order.returnCompletedDate}

                </strong>

              </div>

            )}

            {/* REFUND INFO */}

            {order.refundCompletedDate && (

              <div className="admin-refund-info">

                💰 Refund Completed On:
                {" "}
                <strong>

                  {order.refundCompletedDate}

                </strong>

              </div>

            )}

            {/* CANCEL REQUEST */}

            {normaliseStatus(
              order.status
            ) ===
              "cancellation requested" && (

              <div className="cancel-request-box">

                <h3>
                  Cancellation Request
                </h3>

                <p>

                  <strong>
                    Reason:
                  </strong>

                  {order.cancellationReason}

                </p>

                <div className="cancel-admin-actions">

                  <button

                    className="approve-btn"

                    onClick={() =>
                      approveCancel(
                        String(order.id)
                      )
                    }
                    disabled={Boolean(updatingAction)}

                  >

                    {updatingAction === `${order.id}:approve-cancel`
                      ? "Updating..."
                      : "Approve"}

                  </button>

                  <button

                    className="reject-btn"

                    onClick={() =>
                      rejectCancel(
                        String(order.id)
                      )
                    }
                    disabled={Boolean(updatingAction)}

                  >

                    {updatingAction === `${order.id}:reject-cancel`
                      ? "Updating..."
                      : "Reject"}

                  </button>

                </div>

              </div>

            )}

            {/* RETURN REQUEST */}

            {normaliseStatus(
              order.status
            ) ===
              "return requested" && (

              <div className="return-request-box">

                <h3>
                  Return Request
                </h3>

                <p>

                  <strong>
                    Reason:
                  </strong>

                  {order.returnReason}

                </p>

                {order.returnImage && (

                  <div className="return-proof-wrapper">

                    <h4>
                      Uploaded Product Proof
                    </h4>

                    <img

                      src={order.returnImage}

                      alt="Proof"

                      className="return-proof-image"

                    />

                  </div>

                )}

                {/* PICKUP */}

                <div className="pickup-schedule">

                  <input

                    type="date"

                    value={
                      pickupDate[
                        String(order.id)
                      ] || ""
                    }

                    onChange={(e)=>

                      setPickupDate({

                        ...pickupDate,

                        [String(order.id)]:
                          e.target.value

                      })

                    }

                  />

                  <input

                    type="time"

                    value={
                      pickupTime[
                        String(order.id)
                      ] || ""
                    }

                    onChange={(e)=>

                      setPickupTime({

                        ...pickupTime,

                        [String(order.id)]:
                          e.target.value

                      })

                    }

                  />

                </div>

                <div className="cancel-admin-actions">

                  <button

                    className="approve-btn"

                    onClick={() =>
                      approveReturn(
                        String(order.id)
                      )
                    }
                    disabled={Boolean(updatingAction)}

                  >

                    {updatingAction === `${order.id}:approve-return`
                      ? "Updating..."
                      : "Schedule Pickup"}

                  </button>

                  <button

                    className="reject-btn"

                    onClick={() =>
                      rejectReturn(
                        String(order.id)
                      )
                    }
                    disabled={Boolean(updatingAction)}

                  >

                    {updatingAction === `${order.id}:reject-return`
                      ? "Updating..."
                      : "Reject Return"}

                  </button>

                </div>

              </div>

            )}

            {/* PICKUP SCHEDULED */}

            {normaliseStatus(
              order.status
            ) ===
              "pickup scheduled" && (

              <div className="cancel-request-box">

                <h3>
                  Pickup Scheduled
                </h3>

                <p>

                  <strong>
                    Pickup Date:
                  </strong>

                  {order.pickupDate}

                </p>

                <p>

                  <strong>
                    Pickup Time:
                  </strong>

                  {order.pickupTime}

                </p>

                <button

                  className="approve-btn"

                  onClick={() =>
                    markPickupCompleted(
                      String(order.id)
                    )
                  }
                  disabled={Boolean(updatingAction)}

                >

                  {updatingAction === `${order.id}:pickup-completed`
                    ? "Updating..."
                    : "Mark Pickup Completed"}

                </button>

              </div>

            )}

            {/* PICKUP COMPLETED */}

            {normaliseStatus(
              order.status
            ) ===
              "pickup completed" && (

              <div className="cancel-request-box">

                <h3>
                  Return Pickup Completed
                </h3>

                <p>

                  Customer product has been picked up.

                </p>

                <p>

                  Expected refund by:
                  {" "}

                  <strong>

                    {order.refundDate}

                  </strong>

                </p>

                <button

                  className="approve-btn"

                  onClick={() =>
                    completeReturn(
                      String(order.id)
                    )
                  }
                  disabled={Boolean(updatingAction)}

                >

                  {updatingAction === `${order.id}:return-completed`
                    ? "Updating..."
                    : "Mark Return Completed"}

                </button>

              </div>

            )}

            {/* RETURN COMPLETED */}

            {normaliseStatus(
              order.status
            ) ===
              "return completed" && (

              <div className="cancel-request-box">

                <h3>
                  Refund Processing
                </h3>

                <p>

                  Return has been completed successfully.

                </p>

                <p>

                  Expected refund by:
                  {" "}

                  <strong>

                    {order.refundDate}

                  </strong>

                </p>

                <button

                  className="approve-btn"

                  onClick={() =>
                    completeRefund(
                      String(order.id)
                    )
                  }
                  disabled={Boolean(updatingAction)}

                >

                  {updatingAction === `${order.id}:refund-completed`
                    ? "Updating..."
                    : "Complete Refund"}

                </button>

              </div>

            )}

            {/* STATUS */}

            {!shouldHideDropdown(
              order.status
            ) && (

              <div className="status-update">

                <label>
                  Update Status
                </label>

                <select

                  value={order.status}

                  onChange={(e)=>

                    updateStatus(
                      order.id,
                      e.target.value
                    )

                  }

                  className="status-dropdown"
                  disabled={Boolean(updatingAction)}

                >

                  <option>
                    Processing
                  </option>

                  <option>
                    Shipped
                  </option>

                  <option>
                    Delivered
                  </option>

                  <option>
                    Return Completed
                  </option>

                  <option>
                    Cancelled
                  </option>

                </select>

              </div>

            )}

          </div>

        )))

      )}

    </div>

  );

}

export default AdminOrders;

const db = require("../config/db");

let orderSchemaReady = false;

async function ensureOrderSchema() {
  if (orderSchemaReady) {
    return;
  }

  const statements = [
    "ALTER TABLE order_items ADD COLUMN variant_id INT NULL AFTER product_image",
    "ALTER TABLE order_items ADD COLUMN variant_label VARCHAR(120) NULL AFTER product_image",
    "ALTER TABLE order_items ADD COLUMN variant_dimensions VARCHAR(160) NULL AFTER variant_label"
  ];

  for (const statement of statements) {
    try {
      await db.promise().execute(statement);
    } catch (error) {
      if (error.code !== "ER_DUP_FIELDNAME") {
        throw error;
      }
    }
  }

  orderSchemaReady = true;
}

function runQuery(sql, params = []) {
  return db.promise().execute(sql, params);
}

function generateOrderCode() {
  return (
    "ORD" +
    Math.floor(
      100000 +
      Math.random() * 900000
    )
  );
}

function toSqlDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function toSqlDateTime(value) {
  if (!value) {
    return null;
  }

  const date =
    typeof value === "number"
      ? new Date(value)
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

function formatDateValue(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return String(value).slice(0, 10);
}

function addDaysDate(days) {
  const date = new Date();

  date.setDate(
    date.getDate() + days
  );

  return date;
}

function normalizeStatus(status) {
  return String(status || "")
    .toLowerCase()
    .trim()
    .replace(/-+/g, " ")
    .replace(/\s+/g, " ");
}

function isAllowedTransition(currentStatus, allowedStatuses) {
  return allowedStatuses.includes(
    normalizeStatus(currentStatus)
  );
}

function mapOrderRow(row, items = []) {
  return {
    id: row.order_code,
    databaseId: row.id,
    userId: row.user_id,
    date: row.created_at,
    createdAt: row.created_at,
    cancelUntil: row.cancel_until,
    customer: row.customer_name,
    phone: row.customer_phone,
    address: row.delivery_address,
    total: Number(row.total_amount || 0),
    paid: Number(row.paid_amount || 0),
    remaining: Number(row.remaining_amount || 0),
    paymentMode: row.payment_mode,
    status: row.status,
    deliveryDate: formatDateValue(row.delivery_date),
    deliveredDate: formatDateValue(row.delivered_date),
    cancellationReason: row.cancellation_reason || "",
    returnReason: row.return_reason || "",
    returnImage: row.return_image || "",
    pickupDate: formatDateValue(row.pickup_date),
    pickupTime: row.pickup_time,
    returnCompletedDate: formatDateValue(row.return_completed_date),
    refundStatus: row.refund_status,
    refundDate: formatDateValue(row.refund_date),
    refundCompletedDate: formatDateValue(row.refund_completed_date),
    items
  };
}

async function findOrderRow(id) {
  const [orders] = await runQuery(
    `
      SELECT *
      FROM orders
      WHERE id = ? OR order_code = ?
      LIMIT 1
    `,
    [id, id]
  );

  return orders[0] || null;
}

async function updateOrderById(
  orderId,
  updates,
  allowedStatuses
) {
  const connection = db.promise();

  try {
    await connection.beginTransaction();

    const [orders] = await connection.execute(
      `
        SELECT *
        FROM orders
        WHERE id = ? OR order_code = ?
        LIMIT 1
        FOR UPDATE
      `,
      [orderId, orderId]
    );

    const order = orders[0];

    if (!order) {
      await connection.rollback();

      return {
        statusCode: 404,
        body: {
          success: false,
          message: "Order not found"
        }
      };
    }

    if (
      allowedStatuses &&
      !isAllowedTransition(order.status, allowedStatuses)
    ) {
      await connection.rollback();

      return {
        statusCode: 409,
        body: {
          success: false,
          message: `Cannot update order from ${order.status}.`
        }
      };
    }

    const entries =
      Object.entries(updates);

    if (entries.length > 0) {
      const setSql =
        entries
          .map(([column]) => `${column} = ?`)
          .join(", ");

      await connection.execute(
        `
          UPDATE orders
          SET ${setSql}
          WHERE id = ?
        `,
        [
          ...entries.map(([, value]) => value),
          order.id
        ]
      );
    }

    await connection.commit();

    const updatedOrder =
      await getOrderWithItems(
        "WHERE id = ?",
        [order.id]
      );

    return {
      statusCode: 200,
      body: {
        success: true,
        order: updatedOrder
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function sendOrderUpdate(
  req,
  res,
  updates,
  allowedStatuses
) {
  try {
    const result =
      await updateOrderById(
        req.params.id,
        updates,
        allowedStatuses
      );

    res.status(result.statusCode).json(result.body);
  } catch (error) {
    console.error("Failed to update order:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update order"
    });
  }
}

function mapItemRow(row) {
  return {
    id: row.product_id || row.id,
    orderItemId: row.id,
    productId: row.product_id,
    name: row.product_name,
    image: row.product_image,
    variantId: row.variant_id,
    variantLabel: row.variant_label || "",
    variantDimensions: row.variant_dimensions || "",
    quantity: Number(row.quantity || 0),
    price: Number(row.unit_price || 0),
    lineTotal: Number(row.line_total || 0)
  };
}

async function getOrderWithItems(whereSql, params) {
  await ensureOrderSchema();

  const [orders] = await runQuery(
    `
      SELECT *
      FROM orders
      ${whereSql}
      LIMIT 1
    `,
    params
  );

  if (!orders[0]) {
    return null;
  }

  const [items] = await runQuery(
    `
      SELECT *
      FROM order_items
      WHERE order_id = ?
      ORDER BY id ASC
    `,
    [orders[0].id]
  );

  return mapOrderRow(
    orders[0],
    items.map(mapItemRow)
  );
}

async function createOrder(req, res) {
  const connection = db.promise();

  try {
    await ensureOrderSchema();

    const {
      id,
      userId,
      customer,
      phone,
      address,
      total,
      paid,
      remaining,
      paymentMode,
      status,
      deliveryDate,
      deliveredDate,
      cancelUntil,
      items
    } = req.body;

    if (!req.auth?.id || req.auth.role !== "user") {
      return res.status(401).json({
        success: false,
        message: "Please login before placing an order."
      });
    }

    if (
      !customer ||
      !phone ||
      !address ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide customer, phone, address and order items."
      });
    }

    const orderCode =
      id || generateOrderCode();

    await connection.beginTransaction();

    const [orderResult] = await connection.execute(
      `
        INSERT INTO orders
        (
          order_code,
          user_id,
          customer_name,
          customer_phone,
          delivery_address,
          total_amount,
          paid_amount,
          remaining_amount,
          payment_mode,
          status,
          delivery_date,
          delivered_date,
          cancel_until
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        orderCode,
        req.auth.id,
        customer,
        phone,
        address,
        Number(total || 0),
        Number(paid || total || 0),
        Number(remaining || 0),
        paymentMode || "Online Payment",
        status || "Processing",
        toSqlDate(deliveryDate),
        toSqlDate(deliveredDate),
        toSqlDateTime(cancelUntil)
      ]
    );

    const orderId = orderResult.insertId;

    for (const item of items) {
      const quantity =
        Number(item.quantity || 1);
      const unitPrice =
        Number(item.price || 0);

      await connection.execute(
        `
          INSERT INTO order_items
          (
            order_id,
            product_id,
            product_name,
            product_image,
            variant_id,
            variant_label,
            variant_dimensions,
            quantity,
            unit_price,
            line_total
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          orderId,
          item.productId || item.id || null,
          item.name || "Product",
          item.image || null,
          item.variantId || null,
          item.variantLabel || item.selectedSize || null,
          item.variantDimensions || item.dimensions || null,
          quantity,
          unitPrice,
          quantity * unitPrice
        ]
      );
    }

    await connection.commit();

    const order =
      await getOrderWithItems(
        "WHERE id = ?",
        [orderId]
      );

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order
    });
  } catch (error) {
    await connection.rollback();

    console.error("Failed to create order:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create order"
    });
  }
}

async function getOrders(req, res) {
  try {
    await ensureOrderSchema();

    const [orders] = await runQuery(
      `
        SELECT *
        FROM orders
        ORDER BY id DESC
      `
    );

    if (orders.length === 0) {
      return res.status(200).json({
        success: true,
        orders: []
      });
    }

    const orderIds =
      orders.map(order => order.id);
    const placeholders =
      orderIds.map(() => "?").join(",");

    const [items] = await runQuery(
      `
        SELECT *
        FROM order_items
        WHERE order_id IN (${placeholders})
        ORDER BY id ASC
      `,
      orderIds
    );

    const itemsByOrderId =
      items.reduce((grouped, item) => {
        const key = item.order_id;

        grouped[key] = grouped[key] || [];
        grouped[key].push(mapItemRow(item));

        return grouped;
      }, {});

    res.status(200).json({
      success: true,
      orders: orders.map(order =>
        mapOrderRow(
          order,
          itemsByOrderId[order.id] || []
        )
      )
    });
  } catch (error) {
    console.error("Failed to get orders:", error);

    res.status(500).json({
      success: false,
      message: "Database Error"
    });
  }
}

async function getOrderById(req, res) {
  try {
    const whereSql =
      req.auth?.role === "user"
        ? "WHERE (id = ? OR order_code = ?) AND user_id = ?"
        : "WHERE id = ? OR order_code = ?";

    const params =
      req.auth?.role === "user"
        ? [
            req.params.id,
            req.params.id,
            req.auth.id
          ]
        : [
            req.params.id,
            req.params.id
          ];

    const order =
      await getOrderWithItems(
        whereSql,
        params
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error("Failed to get order:", error);

    res.status(500).json({
      success: false,
      message: "Database Error"
    });
  }
}

async function getMyOrders(req, res) {
  try {
    await ensureOrderSchema();

    const [users] = await runQuery(
      `
        SELECT name, phone
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [req.auth.id]
    );

    const user =
      users[0] || {};

    const [orders] = await runQuery(
      `
        SELECT *
        FROM orders
        WHERE user_id = ?
        ORDER BY id DESC
      `,
      [req.auth.id]
    );

    if (orders.length === 0) {
      return res.status(200).json({
        success: true,
        orders: []
      });
    }

    const orderIds =
      orders.map(order => order.id);
    const placeholders =
      orderIds.map(() => "?").join(",");

    const [items] = await runQuery(
      `
        SELECT *
        FROM order_items
        WHERE order_id IN (${placeholders})
        ORDER BY id ASC
      `,
      orderIds
    );

    const itemsByOrderId =
      items.reduce((grouped, item) => {
        const key = item.order_id;

        grouped[key] = grouped[key] || [];
        grouped[key].push(mapItemRow(item));

        return grouped;
      }, {});

    res.status(200).json({
      success: true,
      orders: orders.map(order =>
        mapOrderRow(
          order,
          itemsByOrderId[order.id] || []
        )
      )
    });
  } catch (error) {
    console.error("Failed to get user orders:", error);

    res.status(500).json({
      success: false,
      message: "Database Error"
    });
  }
}

async function updateStatus(req, res) {
  const status =
    req.body.status;

  const existingOrder =
    await findOrderRow(req.params.id);

  if (!existingOrder) {
    return res.status(404).json({
      success: false,
      message: "Order not found"
    });
  }

  const normalizedTarget =
    normalizeStatus(status);

  const updates = {};
  let allowedStatuses = [];

  if (normalizedTarget === "processing") {
    allowedStatuses = [
      "processing",
      "shipped",
      "return rejected"
    ];
    updates.status = "Processing";
    updates.delivered_date = null;
    updates.pickup_date = null;
    updates.pickup_time = null;
    updates.return_completed_date = null;
    updates.refund_date = null;
    updates.refund_completed_date = null;
    updates.refund_status = null;
  } else if (normalizedTarget === "shipped") {
    allowedStatuses = [
      "processing",
      "shipped"
    ];
    updates.status = "Shipped";
    updates.delivered_date = null;
    updates.pickup_date = null;
    updates.pickup_time = null;
    updates.return_completed_date = null;
    updates.refund_date = null;
    updates.refund_completed_date = null;
    updates.refund_status = null;
  } else if (normalizedTarget === "delivered") {
    allowedStatuses = [
      "processing",
      "shipped",
      "delivered"
    ];
    updates.status = "Delivered";
    updates.delivered_date =
      toSqlDate(new Date());
  } else if (normalizedTarget === "cancelled") {
    allowedStatuses = [
      "processing",
      "shipped",
      "cancellation requested"
    ];
    updates.status = "Cancelled";
  } else {
    return res.status(400).json({
      success: false,
      message: "Unsupported status."
    });
  }

  return sendOrderUpdate(
    req,
    res,
    updates,
    allowedStatuses
  );
}

async function requestCancellation(req, res) {
  const reason =
    String(req.body.reason || "").trim();

  if (!reason) {
    return res.status(400).json({
      success: false,
      message: "Cancellation reason is required."
    });
  }

  return sendOrderUpdate(
    req,
    res,
    {
      status: "Cancellation Requested",
      cancellation_reason: reason
    },
    [
      "processing",
      "shipped"
    ]
  );
}

async function approveCancellation(req, res) {
  return sendOrderUpdate(
    req,
    res,
    {
      status: "Cancelled"
    },
    ["cancellation requested"]
  );
}

async function rejectCancellation(req, res) {
  return sendOrderUpdate(
    req,
    res,
    {
      status: "Processing",
      cancellation_reason: ""
    },
    ["cancellation requested"]
  );
}

async function requestReturn(req, res) {
  const reason =
    String(req.body.reason || "").trim();

  const image =
    req.body.image || "";

  if (!reason) {
    return res.status(400).json({
      success: false,
      message: "Return reason is required."
    });
  }

  if (!image) {
    return res.status(400).json({
      success: false,
      message: "Return image is required."
    });
  }

  return sendOrderUpdate(
    req,
    res,
    {
      status: "Return Requested",
      return_reason: reason,
      return_image: image,
      refund_status: "Pending Approval"
    },
    ["delivered"]
  );
}

async function approveReturn(req, res) {
  const pickupDate =
    toSqlDate(req.body.pickupDate);

  const pickupTime =
    req.body.pickupTime || null;

  if (!pickupDate || !pickupTime) {
    return res.status(400).json({
      success: false,
      message: "Pickup date and time are required."
    });
  }

  return sendOrderUpdate(
    req,
    res,
    {
      status: "Pickup Scheduled",
      pickup_date: pickupDate,
      pickup_time: pickupTime,
      refund_date: toSqlDate(addDaysDate(5)),
      refund_status: "Pending"
    },
    ["return requested"]
  );
}

async function rejectReturn(req, res) {
  return sendOrderUpdate(
    req,
    res,
    {
      status: "Return Rejected"
    },
    ["return requested"]
  );
}

async function markPickupScheduled(req, res) {
  return approveReturn(req, res);
}

async function markPickupCompleted(req, res) {
  return sendOrderUpdate(
    req,
    res,
    {
      status: "Pickup Completed",
      refund_status: "Refund Processing"
    },
    ["pickup scheduled"]
  );
}

async function markReturnCompleted(req, res) {
  return sendOrderUpdate(
    req,
    res,
    {
      status: "Return Completed",
      return_completed_date: toSqlDate(new Date()),
      refund_date: toSqlDate(addDaysDate(5)),
      refund_status: "Refund Processing"
    },
    [
      "pickup completed",
      "return completed"
    ]
  );
}

async function markRefundCompleted(req, res) {
  return sendOrderUpdate(
    req,
    res,
    {
      status: "Refund Completed",
      refund_status: "Refund Completed",
      return_completed_date: toSqlDate(new Date()),
      refund_completed_date: toSqlDate(new Date())
    },
    ["return completed"]
  );
}

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  getMyOrders,
  updateStatus,
  requestCancellation,
  approveCancellation,
  rejectCancellation,
  requestReturn,
  approveReturn,
  rejectReturn,
  markPickupScheduled,
  markPickupCompleted,
  markReturnCompleted,
  markRefundCompleted
};

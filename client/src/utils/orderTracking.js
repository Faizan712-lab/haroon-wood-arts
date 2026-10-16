import {
  FaBoxOpen,
  FaCheckCircle,
  FaRupeeSign,
  FaTimesCircle,
  FaTruck,
  FaUndo
} from "react-icons/fa";

export const ORDER_TRACKING_STEPS = [
  { label: "Order Placed", key: "placed", Icon: FaBoxOpen },
  { label: "Processing", key: "processing", Icon: FaBoxOpen },
  { label: "Shipped", key: "shipped", Icon: FaTruck },
  { label: "Delivered", key: "delivered", Icon: FaCheckCircle }
];

export const CANCELLED_TRACKING_STEPS = [
  { label: "Order Placed", key: "placed", Icon: FaBoxOpen },
  { label: "Cancelled", key: "cancelled", Icon: FaTimesCircle }
];

export const PAYMENT_PENDING_TRACKING_STEPS = [
  { label: "Payment Pending", key: "pending", Icon: FaBoxOpen }
];

export const PAYMENT_EXPIRED_TRACKING_STEPS = [
  { label: "Payment Expired", key: "expired", Icon: FaTimesCircle }
];

export const REFUND_COMPLETED_TRACKING_STEPS = [
  ...ORDER_TRACKING_STEPS,
  { label: "Refund Completed", key: "refunded", Icon: FaRupeeSign }
];

export const RETURN_TRACKING_STATUSES = [
  "return requested",
  "pickup scheduled",
  "pickup completed",
  "return completed",
  "refund completed"
];

export const RETURN_TRACKING_STEPS = [
  { label: "Return Requested", Icon: FaUndo, key: "requested" },
  { label: "Product Picked Up", Icon: FaBoxOpen, key: "pickedUp" },
  { label: "Return Completed", Icon: FaCheckCircle, key: "completed" },
  { label: "Refund Completed", Icon: FaRupeeSign, key: "refunded" }
];

export function normaliseStatus(status) {
  return (status || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function formatOrderDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function getOrderStatusClass(status) {
  const normalised = normaliseStatus(status);
  if (!normalised) return "processing";
  return normalised.replace(/\s+/g, "-");
}

export const getStatusClass = getOrderStatusClass;

export function getOrderStatusIcon(status) {
  const normalised = normaliseStatus(status);

  if (["cancelled", "cancellation requested"].includes(normalised)) {
    return FaTimesCircle;
  }

  if (normalised.includes("return") || normalised.includes("pickup")) {
    return FaUndo;
  }

  if (normalised === "delivered") return FaCheckCircle;
  if (normalised === "shipped") return FaTruck;

  return FaBoxOpen;
}

export function hasDeliveredStatus(status) {
  const normalised = normaliseStatus(status);
  return [
    "delivered",
    "return requested",
    "return rejected",
    "pickup scheduled",
    "pickup completed",
    "return completed",
    "refund completed"
  ].includes(normalised);
}

export function getTrackingStage(status) {
  const normalised = normaliseStatus(status);

  if (normalised === "cancelled") return 1;
  if (normalised === "payment pending" || normalised === "payment expired") return 0;
  if (["processing", "cancellation requested"].includes(normalised)) return 1;
  if (normalised === "shipped") return 2;
  if (hasDeliveredStatus(normalised)) return 3;

  return 0;
}

/**
 * Calculates step state for order tracking timeline.
 * Ensures:
 * - Processing order: Order Placed=complete, Processing=current, Shipped=pending, Delivered=pending
 * - Shipped order: Order Placed=complete, Processing=complete, Shipped=current, Delivered=pending
 * - Delivered order: all valid stages=complete, Delivered=delivered
 */
export function getStepState(index, trackingStage, status) {
  const normalised = normaliseStatus(status);
  const isDelivered = hasDeliveredStatus(normalised);

  if (isDelivered) {
    return {
      isComplete: true,
      isCurrent: false,
      isDelivered: index === 3,
      isPending: false
    };
  }

  const isComplete = index < trackingStage;
  const isCurrent = index === trackingStage;
  const isPending = index > trackingStage;

  return {
    isComplete,
    isCurrent,
    isDelivered: false,
    isPending
  };
}

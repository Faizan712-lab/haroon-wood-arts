export const MAX_CART_ITEM_QUANTITY = 500;
export const MAX_CART_ITEM_QUANTITY_MESSAGE =
  "You can order a maximum of 500 units per product.";

export function validateCartQuantities(items) {
  const totals = new Map();

  for (const item of items || []) {
    const rawQuantity = item?.quantity;
    const quantity = Number(rawQuantity);
    if (
      rawQuantity === undefined ||
      rawQuantity === null ||
      (typeof rawQuantity === "string" && rawQuantity.trim() === "") ||
      !Number.isSafeInteger(quantity) ||
      quantity <= 0
    ) {
      return "Quantity must be a positive whole number.";
    }
    if (quantity > MAX_CART_ITEM_QUANTITY) {
      return MAX_CART_ITEM_QUANTITY_MESSAGE;
    }

    const productId = item.productId || item.id || "0";
    const variantId = item.variantId || "default";
    const key = `${productId}:${variantId}`;
    const combined = (totals.get(key) || 0) + quantity;
    if (combined > MAX_CART_ITEM_QUANTITY) {
      return MAX_CART_ITEM_QUANTITY_MESSAGE;
    }
    totals.set(key, combined);
  }

  return null;
}

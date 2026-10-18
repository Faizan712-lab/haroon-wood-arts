const MAX_CART_ITEM_QUANTITY = 500;
const MAX_CART_ITEM_QUANTITY_MESSAGE =
  "You can order a maximum of 500 units per product.";

function validateCartQuantity(value) {
  if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
    return { valid: false, message: "Quantity must be a positive whole number." };
  }

  const quantity = Number(value);
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    return { valid: false, message: "Quantity must be a positive whole number." };
  }

  if (quantity > MAX_CART_ITEM_QUANTITY) {
    return { valid: false, message: MAX_CART_ITEM_QUANTITY_MESSAGE };
  }

  return { valid: true, quantity };
}

module.exports = {
  MAX_CART_ITEM_QUANTITY,
  MAX_CART_ITEM_QUANTITY_MESSAGE,
  validateCartQuantity
};

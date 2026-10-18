import { createContext, useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { getApiUrl } from "../utils/api";
import {
  MAX_CART_ITEM_QUANTITY,
  MAX_CART_ITEM_QUANTITY_MESSAGE,
  validateCartQuantities
} from "../utils/cartLimits";

export const CartContext = createContext();

const CART_STORAGE_KEY = "haroonStoresCartItems";

function getStoredCartItems() {
  try {
    const storedCart = window.localStorage.getItem(CART_STORAGE_KEY);
    const parsedCart = storedCart ? JSON.parse(storedCart) : [];
    if (!Array.isArray(parsedCart)) return [];

    const mergedItems = new Map();
    parsedCart.forEach(item => {
      if (!item || typeof item !== "object") return;
      const cartItem = { ...item };
      delete cartItem.stock;
      delete cartItem.stockStatus;
      delete cartItem.stock_status;
      delete cartItem.availableStock;
      const productId = cartItem.productId || cartItem.id || "0";
      const variantId = cartItem.variantId || "default";
      const cartKey = `${productId}-${variantId}`;
      const quantity = Math.max(1, Math.floor(Number(cartItem.quantity) || 1));
      const existing = mergedItems.get(cartKey);

      mergedItems.set(cartKey, {
        ...(existing || cartItem),
        ...cartItem,
        cartKey,
        quantity: Math.min(
          MAX_CART_ITEM_QUANTITY,
          (existing?.quantity || 0) + quantity
        )
      });
    });

    return Array.from(mergedItems.values());
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(getStoredCartItems);
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconcileError, setReconcileError] = useState(null);
  const [reconcileNotices, setReconcileNotices] = useState({
    priceChanges: [],
    unavailableItems: [],
    stockIssues: []
  });

  // Keep a ref to the latest cart items so callbacks can access them without recreating
  const cartItemsRef = useRef(cartItems);
  useEffect(() => {
    cartItemsRef.current = cartItems;
  }, [cartItems]);

  // Request ID ref to cancel / ignore out-of-order in-flight responses
  const reconcileReqIdRef = useRef(0);

  // Helper to generate a reliable cart key for items
  function getCartKey(product) {
    if (!product) return "unknown";
    const pid = product.productId || product.id || "0";
    const vid = product.variantId || "default";
    return `${pid}-${vid}`;
  }

  // Reconcile cart against authoritative database values (prices and product/variant existence).
  const reconcileCart = useCallback(async (customItems = null, force = false) => {
    const itemsToVerify = customItems || cartItemsRef.current;
    const currentReqId = ++reconcileReqIdRef.current;
    if (!Array.isArray(itemsToVerify) || itemsToVerify.length === 0) {
      setReconcileNotices({ priceChanges: [], unavailableItems: [], stockIssues: [] });
      setReconcileError(null);
      setIsReconciling(false);
      return { success: true, items: [], hasUnavailableItems: false };
    }

    const quantityError = validateCartQuantities(itemsToVerify);
    if (quantityError) {
      setReconcileError(quantityError);
      setIsReconciling(false);
      return { success: false, quantityError: true, error: quantityError };
    }

    setIsReconciling(true);
    setReconcileError(null);

    try {
      const res = await fetch(getApiUrl("/api/products/reconcile-cart"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsToVerify.map(item => ({
            id: item.id,
            productId: item.productId || item.id,
            variantId: item.variantId || null,
            variantLabel: item.variantLabel || null,
            quantity: item.quantity,
            price: item.price,
            cartKey: item.cartKey || getCartKey(item)
          }))
        })
      });

      // If user performed removal or started another check while in-flight, discard this response
      if (currentReqId !== reconcileReqIdRef.current) {
        return { success: false, aborted: true };
      }

      if (!res.ok) {
        throw new Error(`Failed to verify prices (HTTP ${res.status}).`);
      }

      const data = await res.json();

      if (currentReqId !== reconcileReqIdRef.current) {
        return { success: false, aborted: true };
      }

      if (data.success && Array.isArray(data.items)) {
        // Safe functional update: merge server verified data into CURRENT state only!
        // Never restore items that were removed while the request was in flight!
        setCartItems(prev => {
          const serverMap = new Map();
          for (const sItem of data.items) {
            const key = sItem.cartKey || getCartKey(sItem);
            serverMap.set(key, sItem);
          }

          return prev.map(currentItem => {
            const key = currentItem.cartKey || getCartKey(currentItem);
            const serverItem = serverMap.get(key);
            if (!serverItem) return currentItem;

            return {
              ...currentItem,
              ...serverItem,
              price: Number(serverItem.price ?? currentItem.price),
              isUnavailable: Boolean(serverItem.isUnavailable),
              unavailableReason: serverItem.unavailableReason || null,
              quantity: Math.min(
                MAX_CART_ITEM_QUANTITY,
                Math.max(1, Number(currentItem.quantity) || 1)
              )
            };
          });
        });

        setReconcileNotices({
          priceChanges: data.priceChanges || [],
          unavailableItems: data.unavailableItems || [],
          stockIssues: []
        });

        const hasUnavail = (data.unavailableItems && data.unavailableItems.length > 0) || data.items.some(i => i.isUnavailable);

        return {
          ...data,
          hasUnavailableItems: hasUnavail
        };
      } else {
        throw new Error(data.message || "Failed to reconcile cart.");
      }
    } catch (err) {
      if (currentReqId === reconcileReqIdRef.current) {
        console.error("Cart price validation error:", err);
        setReconcileError("Unable to verify live prices right now. Your cart items are preserved.");
      }
      return { success: false, error: err };
    } finally {
      if (currentReqId === reconcileReqIdRef.current) {
        setIsReconciling(false);
      }
    }
  }, []); // Truly stable callback reference!

  // Initial reconciliation on mount (fires once when there are items)
  const hasInitialReconciled = useRef(false);
  useEffect(() => {
    if (!hasInitialReconciled.current && cartItems.length > 0) {
      hasInitialReconciled.current = true;
      reconcileCart();
    }
  }, [reconcileCart]);

  // Persist to localStorage whenever cartItems changes
  useEffect(() => {
    try {
      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(cartItems)
      );
    } catch {
      // Storage unavailable
    }
  }, [cartItems]);

  function addToCart(product) {
    const quantityToAdd = Number(product.quantity ?? 1);
    if (!Number.isSafeInteger(quantityToAdd) || quantityToAdd <= 0) {
      toast.error("Please enter a valid quantity.");
      return false;
    }

    const cartKey = getCartKey(product);
    const storefrontProduct = { ...product };
    delete storefrontProduct.stock;
    delete storefrontProduct.stockStatus;
    delete storefrontProduct.stock_status;
    delete storefrontProduct.availableStock;
    const previous = cartItemsRef.current;
    const existing = previous.find(item => (item.cartKey || getCartKey(item)) === cartKey);
    const currentQuantity = Math.max(0, Number(existing?.quantity) || 0);

    if (
      quantityToAdd > MAX_CART_ITEM_QUANTITY ||
      currentQuantity + quantityToAdd > MAX_CART_ITEM_QUANTITY
    ) {
      toast.error(MAX_CART_ITEM_QUANTITY_MESSAGE);
      return false;
    }

    const nextItems = existing
      ? previous.map(item =>
          (item.cartKey || getCartKey(item)) === cartKey
            ? { ...item, quantity: currentQuantity + quantityToAdd }
            : item
        )
      : [
          ...previous,
          {
            ...storefrontProduct,
            productId: storefrontProduct.productId || storefrontProduct.id,
            cartKey,
            quantity: quantityToAdd,
            isUnavailable: false
          }
        ];

    cartItemsRef.current = nextItems;
    setCartItems(nextItems);
    return true;
  }

  function removeFromCart(targetKeyOrId) {
    if (!targetKeyOrId) return;
    const target = String(targetKeyOrId);

    // Cancel in-flight reconciliation so its response cannot restore this item
    reconcileReqIdRef.current++;

    setCartItems(prev => {
      const nextItems = prev.filter(item => {
        const key = String(item.cartKey || getCartKey(item));
        const id = String(item.id);
        const prodId = String(item.productId);
        if (key === target) return false;
        if (id === target && !item.variantId) return false;
        if (prodId === target && !item.variantId) return false;
        return true;
      });

      cartItemsRef.current = nextItems;

      if (nextItems.length === 0) {
        setIsReconciling(false);
        setReconcileError(null);
        setReconcileNotices({ priceChanges: [], unavailableItems: [], stockIssues: [] });
      }

      return nextItems;
    });
  }

  function removeUnavailableItems() {
    reconcileReqIdRef.current++;
    setCartItems(prev => {
      const nextItems = prev.filter(item => !item.isUnavailable);
      cartItemsRef.current = nextItems;
      return nextItems;
    });
    setReconcileNotices(prev => ({
      ...prev,
      unavailableItems: []
    }));
  }

  function clearReconcileNotices() {
    setReconcileNotices({ priceChanges: [], unavailableItems: [], stockIssues: [] });
  }

  function increaseQty(targetKeyOrId) {
    const target = String(targetKeyOrId);
    const item = cartItemsRef.current.find(current =>
      String(current.cartKey || getCartKey(current)) === target || String(current.id) === target
    );
    if (!item) return false;
    if (Number(item.quantity) >= MAX_CART_ITEM_QUANTITY) {
      toast.error(MAX_CART_ITEM_QUANTITY_MESSAGE);
      return false;
    }

    const nextItems = cartItemsRef.current.map(current => {
      const key = String(current.cartKey || getCartKey(current));
      return key === target || String(current.id) === target
        ? { ...current, quantity: Number(current.quantity) + 1 }
        : current;
    });
    cartItemsRef.current = nextItems;
    setCartItems(nextItems);
    return true;
  }

  function decreaseQty(targetKeyOrId) {
    const target = String(targetKeyOrId);
    setCartItems(prev =>
      prev
        .map(item => {
          const key = String(item.cartKey || getCartKey(item));
          if (key === target || String(item.id) === target) {
            return { ...item, quantity: item.quantity - 1 };
          }
          return item;
        })
        .filter(item => item.quantity > 0)
    );
  }

  function getTotalPrice() {
    return cartItems
      .filter(item => !item.isUnavailable)
      .reduce(
        (total, item) => total + (Number(item.price || 0) * Number(item.quantity || 1)),
        0
      );
  }

  function clearCart() {
    reconcileReqIdRef.current++;
    setCartItems([]);
    cartItemsRef.current = [];
    setIsReconciling(false);
    setReconcileError(null);
    setReconcileNotices({ priceChanges: [], unavailableItems: [], stockIssues: [] });
  }

  const hasUnavailableItems = cartItems.some(item => item.isUnavailable);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        removeUnavailableItems,
        clearReconcileNotices,
        increaseQty,
        decreaseQty,
        getTotalPrice,
        clearCart,
        reconcileCart,
        isReconciling,
        reconcileError,
        reconcileNotices,
        hasUnavailableItems
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

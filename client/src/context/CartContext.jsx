import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { getApiUrl } from "../utils/api";

export const CartContext = createContext();

const CART_STORAGE_KEY = "haroonStoresCartItems";

function getStoredCartItems() {
  try {
    const storedCart = window.localStorage.getItem(CART_STORAGE_KEY);
    const parsedCart = storedCart ? JSON.parse(storedCart) : [];
    return Array.isArray(parsedCart) ? parsedCart : [];
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
    if (product.cartKey) return String(product.cartKey);
    const pid = product.productId || product.id || "0";
    const vid = product.variantId || "default";
    return `${pid}-${vid}`;
  }

  // Reconcile cart against authoritative database values (prices, availability, stock)
  const reconcileCart = useCallback(async (customItems = null, force = false) => {
    const itemsToVerify = customItems || cartItemsRef.current;
    if (!Array.isArray(itemsToVerify) || itemsToVerify.length === 0) {
      setReconcileNotices({ priceChanges: [], unavailableItems: [], stockIssues: [] });
      setReconcileError(null);
      setIsReconciling(false);
      return { success: true, items: [], hasUnavailableItems: false };
    }

    const currentReqId = ++reconcileReqIdRef.current;
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
              availableStock: serverItem.availableStock,
              quantity: serverItem.availableStock !== undefined && serverItem.availableStock > 0
                ? Math.min(currentItem.quantity, serverItem.availableStock)
                : currentItem.quantity
            };
          });
        });

        setReconcileNotices({
          priceChanges: data.priceChanges || [],
          unavailableItems: data.unavailableItems || [],
          stockIssues: data.stockIssues || []
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
    const cartKey = product.cartKey || getCartKey(product);
    setCartItems(prev => {
      const exists = prev.find(item => (item.cartKey || getCartKey(item)) === cartKey);
      if (exists) {
        return prev.map(item =>
          (item.cartKey || getCartKey(item)) === cartKey
            ? { ...item, quantity: item.quantity + (product.quantity || 1) }
            : item
        );
      }
      return [
        ...prev,
        {
          ...product,
          productId: product.productId || product.id,
          cartKey,
          quantity: product.quantity || 1,
          isUnavailable: false
        }
      ];
    });
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
    setCartItems(prev =>
      prev.map(item => {
        const key = String(item.cartKey || getCartKey(item));
        if (key === target || String(item.id) === target) {
          if (item.availableStock !== undefined && item.quantity >= item.availableStock) {
            return item;
          }
          return { ...item, quantity: item.quantity + 1 };
        }
        return item;
      })
    );
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

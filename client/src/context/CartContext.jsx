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
  const [reconcileNotices, setReconcileNotices] = useState({
    priceChanges: [],
    unavailableItems: [],
    stockIssues: []
  });

  // Reconcile cart against authoritative database values
  const reconcileCart = useCallback(async (currentItems = null) => {
    const itemsToVerify = currentItems || cartItems;
    if (!Array.isArray(itemsToVerify) || itemsToVerify.length === 0) {
      setReconcileNotices({ priceChanges: [], unavailableItems: [], stockIssues: [] });
      return { success: true, items: [] };
    }

    try {
      setIsReconciling(true);
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
            cartKey: item.cartKey || `${item.productId || item.id}-${item.variantId || "default"}`
          }))
        })
      });

      if (!res.ok) {
        throw new Error("Failed to reconcile cart.");
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setCartItems(data.items);
        setReconcileNotices({
          priceChanges: data.priceChanges || [],
          unavailableItems: data.unavailableItems || [],
          stockIssues: data.stockIssues || []
        });
        return data;
      }
    } catch (err) {
      console.error("Cart reconciliation error:", err);
    } finally {
      setIsReconciling(false);
    }
  }, [cartItems]);

  // Initial reconciliation on mount
  const hasInitialReconciled = useRef(false);
  useEffect(() => {
    if (!hasInitialReconciled.current && cartItems.length > 0) {
      hasInitialReconciled.current = true;
      reconcileCart(cartItems);
    }
  }, [reconcileCart]);

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

  function getCartKey(product) {
    return `${product.productId || product.id}-${product.variantId || "default"}`;
  }

  function addToCart(product) {
    const cartKey = product.cartKey || getCartKey(product);
    setCartItems(prev => {
      const exists = prev.find(item => item.cartKey === cartKey);
      if (exists) {
        return prev.map(item =>
          item.cartKey === cartKey
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          ...product,
          productId: product.productId || product.id,
          cartKey,
          quantity: 1,
          isUnavailable: false
        }
      ];
    });
  }

  function removeFromCart(id) {
    setCartItems(prev =>
      prev.filter(
        item => String(item.cartKey || item.id) !== String(id)
      )
    );
  }

  function removeUnavailableItems() {
    setCartItems(prev => prev.filter(item => !item.isUnavailable));
    setReconcileNotices(prev => ({
      ...prev,
      unavailableItems: []
    }));
  }

  function clearReconcileNotices() {
    setReconcileNotices({ priceChanges: [], unavailableItems: [], stockIssues: [] });
  }

  function increaseQty(id) {
    setCartItems(prev =>
      prev.map(item => {
        if (String(item.cartKey || item.id) === String(id)) {
          if (item.availableStock !== undefined && item.quantity >= item.availableStock) {
            return item;
          }
          return { ...item, quantity: item.quantity + 1 };
        }
        return item;
      })
    );
  }

  function decreaseQty(id) {
    setCartItems(prev =>
      prev.map(item =>
        String(item.cartKey || item.id) === String(id) && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
    );
  }

  // Calculate total price using ONLY available items
  function getTotalPrice() {
    return cartItems
      .filter(item => !item.isUnavailable)
      .reduce(
        (total, item) => total + (Number(item.price || 0) * Number(item.quantity || 1)),
        0
      );
  }

  function clearCart() {
    setCartItems([]);
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
        reconcileNotices,
        hasUnavailableItems
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

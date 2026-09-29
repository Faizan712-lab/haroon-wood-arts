import { createContext, useEffect, useState } from "react";

export const CartContext =
  createContext();

const CART_STORAGE_KEY = "haroonStoresCartItems";

function getStoredCartItems() {

  try {
    const storedCart =
      window.localStorage.getItem(CART_STORAGE_KEY);

    const parsedCart =
      storedCart ? JSON.parse(storedCart) : [];

    return Array.isArray(parsedCart)
      ? parsedCart
      : [];
  } catch {
    return [];
  }

}

export function CartProvider({ children }) {

  const [cartItems,
    setCartItems] =
    useState(getStoredCartItems);

  useEffect(() => {

    try {
      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(cartItems)
      );
    } catch {
      // Keep cart interactions available when browser storage is unavailable.
    }

  }, [cartItems]);

  /* ADD PRODUCT */
  function getCartKey(product) {
    return `${product.id}-${product.variantId || "default"}`;
  }

  function addToCart(product) {
    const cartKey =
      product.cartKey || getCartKey(product);

    setCartItems(prev => {

      const exists =
        prev.find(
          item =>
          item.cartKey === cartKey
        );

      if (exists) {

        return prev.map(item =>

          item.cartKey === cartKey

            ? {
                ...item,
                quantity:
                  item.quantity + 1
              }

            : item

        );

      }

      return [

        ...prev,

        {
          ...product,
          cartKey,
          quantity: 1
        }

      ];

    });

  }

  /* REMOVE */

  function removeFromCart(id) {

    setCartItems(prev =>

      prev.filter(
        item =>
        String(item.cartKey || item.id) !==
        String(id)
      )

    );

  }

  /* INCREASE */

  function increaseQty(id) {

    setCartItems(prev =>

      prev.map(item =>

        String(item.cartKey || item.id) ===
        String(id)

          ? {
              ...item,
              quantity:
                item.quantity + 1
            }

          : item

      )

    );

  }

  /* DECREASE */

  function decreaseQty(id) {

    setCartItems(prev =>

      prev.map(item =>

        String(item.cartKey || item.id) ===
        String(id) &&
        item.quantity > 1

          ? {
              ...item,
              quantity:
                item.quantity - 1
            }

          : item

      )

    );

  }

  /* 🔥 TOTAL PRICE — THIS FIXES YOUR BUG */

  function getTotalPrice() {

    return cartItems.reduce(

      (total, item) =>

        total +
        (item.price * item.quantity),

      0

    );

  }

  /* CLEAR CART */

  function clearCart() {

    setCartItems([]);

  }

  return (

    <CartContext.Provider

      value={{

        cartItems,

        addToCart,

        removeFromCart,

        increaseQty,

        decreaseQty,

        getTotalPrice,

        clearCart

      }}

    >

      {children}

    </CartContext.Provider>

  );

}

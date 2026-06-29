import { createContext, useState } from "react";

export const CartContext =
  createContext();

export function CartProvider({ children }) {

  const [cartItems,
    setCartItems] =
    useState([]);

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

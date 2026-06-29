import "./Cart.css";

import { useContext } from "react";
import { useNavigate } from "react-router-dom";

import { CartContext }
from "../context/CartContext";

import {
  PRODUCT_PLACEHOLDER,
  handleImageFallback
}
from "../utils/imageFallback";

import {
  getVariantLabel
} from "../utils/productDisplay";

function Cart() {

  const navigate = useNavigate();

  const {
    cartItems,
    removeFromCart,
    increaseQty,
    decreaseQty,
    getTotalPrice
  } = useContext(CartContext);

  const total =
    getTotalPrice();

  return (

    <div className="cart">

      <h1>
        Your Cart
      </h1>

      {cartItems.length === 0 ? (

        <p>
          Your cart is empty
        </p>

      ) : (

        <>

          {cartItems.map(item => (

            <div
              key={item.cartKey || item.id}
              className="cart-item"
            >

              {/* LEFT SIDE */}

              <div className="cart-left">

                <img
                  src={item.image || PRODUCT_PLACEHOLDER}
                  alt={item.name}
                  onError={handleImageFallback}
                />

                <div className="cart-details">

                  <h3>
                    {item.name}
                  </h3>

                  <p>
                    Rs. {item.price}
                  </p>

                  {getVariantLabel(item) && (
                    <p className="cart-variant">
                      {getVariantLabel(item)}
                    </p>
                  )}

                  {/* QUANTITY */}

                  <div className="quantity">

                    <button
                      onClick={() =>
                        decreaseQty(item.cartKey || item.id)
                      }
                    >
                      -
                    </button>

                    <span>
                      {item.quantity}
                    </span>

                    <button
                      onClick={() =>
                        increaseQty(item.cartKey || item.id)
                      }
                    >
                      +
                    </button>

                  </div>

                </div>

              </div>

              {/* REMOVE */}

              <button
                className="remove-btn"
                onClick={() =>
                  removeFromCart(item.cartKey || item.id)
                }
              >

                Remove

              </button>

            </div>

          ))}

          {/* SUMMARY */}

          <div className="cart-summary">

            <div className="cart-total">

              Total: Rs. {total}

            </div>

            <button
              className="checkout-btn"
              onClick={() =>
                navigate("/checkout")
              }
            >

              Proceed to Checkout

            </button>

          </div>

        </>

      )}

    </div>

  );

}

export default Cart;

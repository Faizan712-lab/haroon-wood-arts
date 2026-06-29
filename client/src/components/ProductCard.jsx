import "./ProductCard.css";
import { useContext } from "react";
import { CartContext } from "../context/CartContext";
import {
  PRODUCT_PLACEHOLDER,
  handleImageFallback
} from "../utils/imageFallback";

function ProductCard({ product }) {

  const { addToCart } = useContext(CartContext);

  function handleClick() {

    addToCart(product);

  }

  return (

    <div className="product-card">

      <img
        src={product.image || PRODUCT_PLACEHOLDER}
        alt={product.name}
        onError={handleImageFallback}
      />

      <h3>
        {product.name}
      </h3>

      <p className="price">
        ₹ {product.price}
      </p>

      <button onClick={handleClick}>
        Add to Cart
      </button>

    </div>

  );

}

export default ProductCard;

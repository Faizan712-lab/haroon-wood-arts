import "./ProductCard.css";
import { useContext } from "react";
import { CartContext } from "../context/CartContext";
import {
  PRODUCT_PLACEHOLDER,
  getPrimaryImage,
  getSecondaryImage,
  handleImageFallback
} from "../utils/imageFallback";

function ProductCard({ product }) {

  const { addToCart } = useContext(CartContext);
  const primaryImage = getPrimaryImage(product);
  const secondaryImage = getSecondaryImage(product);

  function handleClick() {

    addToCart(product);

  }

  return (

    <div className="product-card">

      <div className="product-image-frame product-card-image-frame">
        <img
          src={primaryImage || PRODUCT_PLACEHOLDER}
          alt={product.name}
          loading="lazy"
          onError={handleImageFallback}
        />

        {secondaryImage && (
          <img
            className="product-card-hover-image"
            src={secondaryImage}
            alt=""
            loading="lazy"
            onError={handleImageFallback}
          />
        )}
      </div>

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

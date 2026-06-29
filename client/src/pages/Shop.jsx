import Products
from "../components/Products";

import {
  useLocation
}
from "react-router-dom";

function Shop() {

  const location =
    useLocation();

  const params =
    new URLSearchParams(
      location.search
    );

  const selectedCategory =

    params.get("category");

  return (

    <div>

      <Products
        selectedCategory={
          selectedCategory
        }
      />

    </div>

  );

}

export default Shop;
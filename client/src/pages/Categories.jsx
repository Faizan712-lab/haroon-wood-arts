import "./Categories.css";

import {
  useEffect,
  useState
}
from "react";

import {
  useNavigate
}
from "react-router-dom";

import {
  getApiUrl
}
from "../utils/api";
import {
  getImageList
} from "../utils/imageFallback";

const CATEGORY_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='420' viewBox='0 0 640 420'%3E%3Crect width='640' height='420' fill='%23f3ede7'/%3E%3Cpath d='M90 315h460L425 165 328 270l-64-72z' fill='%23d7c7b7'/%3E%3Ccircle cx='216' cy='145' r='38' fill='%23e7d8c8'/%3E%3Ctext x='320' y='365' text-anchor='middle' font-family='Arial' font-size='28' fill='%23705a4b'%3ECategory Image%3C/text%3E%3C/svg%3E";

function Categories({

  homeSection = false

}) {

  const [categories,
    setCategories] =
    useState([]);

  const navigate =
    useNavigate();

  /* LOAD CATEGORIES */

  useEffect(() => {

    async function loadCategories() {

      try {

        const response = await fetch(
          getApiUrl("/api/categories"),
          {
            cache: "no-store"
          }
        );

        const data =
          await response.json();

        if (response.ok && data.success) {

          setCategories(
            data.categories || []
          );

        }

      } catch (error) {

        console.error(
          "Failed to load product categories:",
          error
        );

      }

    }

    loadCategories();

  }, []);

  /* OPEN CATEGORY */

  function openCategory(
    categoryName
  ) {

    navigate(

      `/shop?category=${categoryName}`

    );

  }

  function handleImageError(event) {
    event.currentTarget.onerror = null;
    event.currentTarget.src = CATEGORY_PLACEHOLDER;
  }

  return (

    <section

      className={
        homeSection
          ? "categories-page home-categories-section"
          : "categories-page"
      }

    >

      <div className="categories-container">

        <p className="categories-tag">

          OUR COLLECTION

        </p>

        {homeSection ? (

          <h2 className="categories-title">

            Shop By Categories

          </h2>

        ) : (

          <h1 className="categories-title">

            Shop By Categories

          </h1>

        )}

        {categories.length === 0 ? (

          <div className="empty-categories">

            <h2>
              No Categories Added
            </h2>

            <p>
              Categories added by admin
              will appear here.
            </p>

          </div>

        ) : (

          <div className="categories-grid">

            {categories.map((category) => (

              <div

                key={category.id}

                className="category-card"

                onClick={() =>

                  openCategory(
                    category.name
                  )

                }

              >

                <img

                  src={getImageList(category)[0] || CATEGORY_PLACEHOLDER}

                  alt={category.name}
                  loading="lazy"
                  onError={handleImageError}

                />

                <div className="category-overlay">

                  <h2>
                    {category.name}
                  </h2>

                  <p>
                    Explore Collection
                  </p>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    </section>

  );

}

export default Categories;

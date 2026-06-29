import "./About.css";

import {
  FaGem,
  FaHandsHelping,
  FaHeart,
  FaShippingFast
} from "react-icons/fa";

function About() {

  return (

    <div className="about-page">

      <div className="about-hero">

        <span className="about-tag">
          OUR STORY
        </span>

        <h1>
          About Haroon Stores
        </h1>

        <p className="about-subtitle">
          Bringing authentic Kashmiri craftsmanship
          to homes with elegance, tradition,
          and timeless artistry.
        </p>

      </div>

      <div className="about-container">

        <div className="about-card">

          <h2>
            Who We Are
          </h2>

          <p>
            Haroon Stores is a premium destination
            for authentic Kashmiri handcrafted
            products made with passion and heritage.
            We specialize in wooden decor,
            traditional handicrafts, vases,
            key chains, and artistic handmade items
            inspired by the rich culture of Kashmir.
          </p>

          <p>
            Every product is carefully crafted
            by skilled artisans using traditional
            techniques passed down through generations.
            Our mission is to preserve Kashmiri
            craftsmanship while bringing elegant,
            high-quality products to customers
            across India.
          </p>

        </div>

        <div className="about-features">

          <div className="feature-box">
            <div className="feature-icon">
              <FaHandsHelping />
            </div>
            <h3>Authentic Handcrafts</h3>
            <p>
              Genuine Kashmiri handmade
              wooden products crafted
              with precision and artistry.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon">
              <FaShippingFast />
            </div>
            <h3>Fast Delivery</h3>
            <p>
              Reliable and secure delivery
              with smooth order tracking
              across India.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon">
              <FaGem />
            </div>
            <h3>Premium Quality</h3>
            <p>
              Carefully selected materials
              and elegant finishing
              for every product.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon">
              <FaHeart />
            </div>
            <h3>Made With Passion</h3>
            <p>
              Supporting local Kashmiri
              artisans and preserving
              cultural heritage.
            </p>
          </div>

        </div>

      </div>

    </div>

  );

}

export default About;

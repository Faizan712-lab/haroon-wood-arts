import "./Hero.css";

import heroImg
from "../assets/hero1.png";

import { motion }
from "framer-motion";

import { useNavigate }
from "react-router-dom";

function Hero() {

  const navigate =
    useNavigate();

  return (

    <section

      className="hero"

      style={{

        backgroundImage:
          `linear-gradient(
            90deg,
            rgba(0,0,0,0.78) 0%,
            rgba(0,0,0,0.66) 46%,
            rgba(0,0,0,0.46) 100%
          ), url(${heroImg})`

      }}

    >

      <motion.div

        className="hero-content"

        initial={{
          opacity: 0,
          x: -60
        }}

        animate={{
          opacity: 1,
          x: 0
        }}

        transition={{
          duration: 0.8
        }}

      >

        {/* TAG */}

        <motion.p

          className="hero-tag"

          initial={{
            opacity: 0,
            y: 20
          }}

          animate={{
            opacity: 1,
            y: 0
          }}

          transition={{
            delay: 0.2
          }}

        >

          HANDMADE WITH PASSION

        </motion.p>

        {/* TITLE */}

        <motion.h1

          initial={{
            opacity: 0,
            y: 30
          }}

          animate={{
            opacity: 1,
            y: 0
          }}

          transition={{
            delay: 0.3
          }}

        >

          Kashmiri Handicrafts Made with Heritage

        </motion.h1>

        {/* DESCRIPTION */}

        <motion.p

          className="hero-description"

          initial={{
            opacity: 0
          }}

          animate={{
            opacity: 1
          }}

          transition={{
            delay: 0.5
          }}

        >

          Discover the beauty of authentic Kashmiri wooden crafts —

          handcrafted with love and tradition.

        </motion.p>

        {/* BUTTON */}

        <motion.button

          className="hero-btn"

          whileHover={{
            scale: 1.08
          }}

          whileTap={{
            scale: 0.95
          }}

          onClick={() =>
            navigate("/shop")
          }

        >

          Shop Now →

        </motion.button>

        {/* FEATURES */}

        <motion.div

          className="hero-features"

          initial={{
            opacity: 0
          }}

          animate={{
            opacity: 1
          }}

          transition={{
            delay: 0.7
          }}

        >

          <div className="feature">

            <h4>
              Premium Quality
            </h4>

            <p>
              Best craftsmanship
            </p>

          </div>

          <div className="feature">

            <h4>
              Eco Friendly
            </h4>

            <p>
              Sustainable materials
            </p>

          </div>

          <div className="feature">

            <h4>
              Secure Packaging
            </h4>

            <p>
              Safe delivery
            </p>

          </div>

        </motion.div>

      </motion.div>

    </section>

  );

}

export default Hero;

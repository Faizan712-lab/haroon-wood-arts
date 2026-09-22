import "./Footer.css";

function Footer() {

  return (

    <footer className="footer">

      <div className="footer-container">

        {/* BRAND */}

        <div className="footer-section">

          <h2 className="footer-logo">

            Haroon Stores

          </h2>

          <p className="footer-description">

            Premium Kashmiri handcrafted
            wooden products made with
            heritage, elegance, and passion.

          </p>

        </div>

        {/* PAYMENTS */}

        <div className="footer-section">

          <h3>
            Supported Payments
          </h3>

          <p className="payment-text">

            Secure payments supported
            across all major platforms.

          </p>

          <div className="payment-grid">

            <div className="payment-card">

              <img
                src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg"
                alt="Google Pay"
              />

            </div>

            <div className="payment-card">

              <img
                src="https://upload.wikimedia.org/wikipedia/commons/7/71/PhonePe_Logo.svg"
                alt="PhonePe"
              />

            </div>

            <div className="payment-card">

              <img
                src="https://upload.wikimedia.org/wikipedia/commons/4/42/Paytm_logo.png"
                alt="Paytm"
              />

            </div>

            <div className="payment-card">

              <img
                src="https://cdn-icons-png.flaticon.com/512/349/349221.png"
                alt="Visa"
              />

            </div>

            <div className="payment-card">

              <img
                src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg"
                alt="MasterCard"
              />

            </div>

            <div className="payment-card">

              <img
                src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg"
                alt="PayPal"
              />

            </div>

          </div>

        </div>

        {/* CONTACT */}

        <div className="footer-section">

          <h3>
            Contact
          </h3>

          {/* PHONE */}

          <div className="footer-contact-item">

            <img
              src="https://cdn-icons-png.flaticon.com/512/724/724664.png"
              alt="Phone"
              className="contact-real-icon"
            />

            <span>
              +91-9697010949
            </span>

          </div>

          {/* EMAIL */}

          <div className="footer-contact-item">

            <img
              src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg"
              alt="Gmail"
              className="contact-real-icon"
            />

            <span>
              haroonstores3@gmail.com
            </span>

          </div>

          {/* LOCATION */}

          <div className="footer-contact-item">

            <img
              src="https://cdn-icons-png.flaticon.com/512/684/684908.png"
              alt="Location"
              className="contact-real-icon"
            />

            <span>
              Shalimar, Opposite Shalimar Garden,
              190025, Srinagar, Jammu & Kashmir, India
            </span>

          </div>

        </div>

        {/* SOCIAL */}

        <div className="footer-section">

          <h3>
            Connect
          </h3>

          <a

            href="https://wa.me/919697010949"

            target="_blank"

            rel="noreferrer"

            className="footer-whatsapp"

          >

            <img

              src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"

              alt="WhatsApp"

            />

            Chat on WhatsApp

          </a>

        </div>

      </div>

      {/* BOTTOM */}

      <div className="footer-bottom">

        © 2026 Haroon Stores.
        All Rights Reserved.

      </div>

    </footer>

  );

}

export default Footer;
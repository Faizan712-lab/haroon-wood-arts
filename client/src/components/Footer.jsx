import "./Footer.css";

import logo from "../assets/logo.png";
import gmailIcon from "../assets/gmail-icon.svg";
import googleMapsIcon from "../assets/google-maps-icon.svg";
import {
  FaPhoneAlt,
  FaWhatsapp
} from "react-icons/fa";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* 1. BRAND SECTION */}
        <div className="footer-section footer-brand-section">
          <div className="footer-brand-header">
            <img src={logo} alt="Haroon Stores logo" className="footer-brand-logo" />
            <h2 className="footer-brand-name">Haroon Stores</h2>
          </div>
          <p className="footer-description">
            Premium Kashmiri handcrafted wooden products made with heritage, elegance, and passion.
          </p>
        </div>

        {/* 2. SUPPORTED PAYMENTS */}
        <div className="footer-section footer-payment-section">
          <h3 className="footer-heading">Supported Payments</h3>
          <p className="payment-text">
            Secure payments supported across all major platforms.
          </p>

          <div className="payment-grid">
            <div className="payment-card" title="Google Pay">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg"
                alt="Google Pay"
                loading="lazy"
              />
            </div>

            <div className="payment-card" title="PhonePe">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/7/71/PhonePe_Logo.svg"
                alt="PhonePe"
                loading="lazy"
              />
            </div>

            <div className="payment-card" title="Paytm">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/4/42/Paytm_logo.png"
                alt="Paytm"
                loading="lazy"
              />
            </div>

            <div className="payment-card" title="Visa">
              <img
                src="https://cdn-icons-png.flaticon.com/512/349/349221.png"
                alt="Visa"
                loading="lazy"
              />
            </div>

            <div className="payment-card" title="MasterCard">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg"
                alt="MasterCard"
                loading="lazy"
              />
            </div>

            <div className="payment-card" title="PayPal">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg"
                alt="PayPal"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        {/* 3. CONTACT */}
        <div className="footer-section footer-contact-section">
          <h3 className="footer-heading">Contact</h3>

          <div className="footer-contact-item">
            <span className="footer-contact-icon-wrapper" aria-hidden="true">
              <FaPhoneAlt className="footer-contact-phone-icon" />
            </span>
            <a href="tel:+919697010949" className="footer-contact-link">
              +91-9697010949
            </a>
          </div>

          <div className="footer-contact-item">
            <span className="footer-contact-icon-wrapper" aria-hidden="true">
              <img
                src={gmailIcon}
                alt="Gmail"
                className="footer-contact-gmail-icon"
              />
            </span>
            <a href="mailto:malikafridi258@gmail.com" className="footer-contact-link">
              malikafridi258@gmail.com
            </a>
          </div>

          <div className="footer-contact-item">
            <span className="footer-contact-icon-wrapper" aria-hidden="true">
              <img
                src={googleMapsIcon}
                alt="Google Maps"
                className="footer-contact-maps-icon"
              />
            </span>
            <span className="footer-address">
              Shalimar, Opposite Shalimar Garden, 190025, Srinagar, Jammu & Kashmir, India
            </span>
          </div>
        </div>

        {/* 4. CONNECT / WHATSAPP */}
        <div className="footer-section footer-connect-section">
          <h3 className="footer-heading">Connect</h3>
          <p className="connect-text">
            Have questions or need custom woodwork? Chat directly with us.
          </p>

          <a
            href="https://wa.me/919697010949"
            target="_blank"
            rel="noreferrer"
            className="footer-whatsapp"
            aria-label="Chat on WhatsApp"
          >
            <FaWhatsapp className="whatsapp-icon" aria-hidden="true" />
            <span>Chat on WhatsApp</span>
          </a>
        </div>
      </div>

      {/* 5. COPYRIGHT BOTTOM BAR */}
      <div className="footer-bottom">
        <p className="footer-copyright">
          © 2026 Haroon Stores. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
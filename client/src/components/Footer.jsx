import "./Footer.css";
import { Link } from "react-router-dom";

import logo from "../assets/logo.png";
import {
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaWhatsapp,
  FaHandHolding
} from "react-icons/fa";
import {
  SiPhonepe,
  SiPaytm,
  SiVisa,
  SiMastercard,
  SiRazorpay
} from "react-icons/si";

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
          <h3 className="footer-heading">SUPPORTED PAYMENTS</h3>

          <div className="payment-grid" aria-label="Supported payment methods">
            <div className="payment-card payment-card-gpay" title="Google Pay" aria-label="Google Pay">
              <svg width="41" height="17" viewBox="0 0 41 17" fill="none" xmlns="http://www.w3.org/2000/svg" className="footer-gpay-svg">
                <path d="M19.526 2.635v4.083h2.518c.6 0 1.096-.202 1.488-.605.403-.402.605-.882.605-1.437 0-.544-.202-1.018-.605-1.422-.392-.413-.888-.62-1.488-.62h-2.518zm0 5.52v4.736h-1.504V1.198h3.99c1.013 0 1.873.337 2.582 1.012.72.675 1.08 1.497 1.08 2.466 0 .991-.36 1.819-1.08 2.482-.697.665-1.559.996-2.583.996h-2.485v.001zm7.668 2.287c0 .392.166.718.499.98.332.26.722.391 1.168.391.633 0 1.196-.234 1.692-.701.497-.469.744-1.019.744-1.65-.469-.37-1.123-.555-1.962-.555-.61 0-1.12.148-1.528.442-.409.294-.613.657-.613 1.093m1.946-5.815c1.112 0 1.989.297 2.633.89.642.594.964 1.408.964 2.442v4.932h-1.439v-1.11h-.065c-.622.914-1.45 1.372-2.486 1.372-.882 0-1.621-.262-2.215-.784-.594-.523-.891-1.176-.891-1.96 0-.828.313-1.486.94-1.976s1.463-.735 2.51-.735c.892 0 1.629.163 2.206.49v-.344c0-.522-.207-.966-.621-1.33a2.132 2.132 0 0 0-1.455-.547c-.84 0-1.504.353-1.995 1.062l-1.324-.834c.73-1.045 1.81-1.568 3.238-1.568m11.853.262l-5.02 11.53H34.42l1.864-4.034-3.302-7.496h1.635l2.387 5.749h.032l2.322-5.75z" fill="#3c4043" />
                <path d="M13.448 7.134c0-.473-.04-.93-.116-1.366H6.988v2.588h3.634a3.11 3.11 0 0 1-1.344 2.042v1.68h2.169c1.27-1.17 2.001-2.9 2.001-4.944" fill="#4285F4" />
                <path d="M6.988 13.7c1.816 0 3.344-.595 4.459-1.621l-2.169-1.681c-.603.406-1.38.643-2.29.643-1.754 0-3.244-1.182-3.776-2.774H.978v1.731a6.728 6.728 0 0 0 6.01 3.703" fill="#34A853" />
                <path d="M3.212 8.267a4.034 4.034 0 0 1 0-2.572V3.964H.978A6.678 6.678 0 0 0 .261 6.98c0 1.085.26 2.11.717 3.017l2.234-1.731z" fill="#FBBC05" />
                <path d="M6.988 2.921c.992 0 1.88.34 2.58 1.008v.001l1.92-1.918C10.324.928 8.804.262 6.989.262a6.728 6.728 0 0 0-6.01 3.702l2.234 1.731c.532-1.592 2.022-2.774 3.776-2.774" fill="#EA4335" />
              </svg>
            </div>

            <div className="payment-card payment-card-phonepe" title="PhonePe" aria-label="PhonePe">
              <SiPhonepe className="footer-phonepe-svg" aria-hidden="true" />
            </div>

            <div className="payment-card payment-card-paytm" title="Paytm" aria-label="Paytm">
              <SiPaytm className="footer-paytm-svg" aria-hidden="true" />
            </div>

            <div className="payment-card payment-card-razorpay" title="Razorpay" aria-label="Razorpay">
              <SiRazorpay className="footer-razorpay-svg" aria-hidden="true" />
            </div>

            <div className="payment-card payment-card-visa" title="Visa" aria-label="Visa">
              <SiVisa className="footer-visa-svg" aria-hidden="true" />
            </div>

            <div className="payment-card payment-card-mastercard" title="MasterCard" aria-label="MasterCard">
              <SiMastercard className="footer-mastercard-svg" aria-hidden="true" />
            </div>

            <div className="payment-card payment-card-cod" title="Cash on Delivery" aria-label="Cash on Delivery">
              <FaHandHolding className="footer-cod-icon" aria-hidden="true" />
              <span className="footer-cod-text">COD</span>
            </div>
          </div>
        </div>

        {/* 3. CONTACT */}
        <div className="footer-section footer-contact-section">
          <h3 className="footer-heading">CONTACT</h3>

          <div className="footer-contact-item">
            <span className="footer-contact-icon-wrapper" aria-hidden="true">
              <FaPhoneAlt className="footer-contact-icon" />
            </span>
            <a href="tel:+919697010949" className="footer-contact-link">
              +91-9697010949
            </a>
          </div>

          <div className="footer-contact-item">
            <span className="footer-contact-icon-wrapper" aria-hidden="true">
              <FaEnvelope className="footer-contact-icon" />
            </span>
            <a href="mailto:malikafridi258@gmail.com" className="footer-contact-link">
              malikafridi258@gmail.com
            </a>
          </div>

          <div className="footer-contact-item">
            <span className="footer-contact-icon-wrapper" aria-hidden="true">
              <FaMapMarkerAlt className="footer-contact-icon" />
            </span>
            <span className="footer-address">
              Shalimar, Opposite Shalimar Garden, 190025, Srinagar, Jammu &amp; Kashmir, India
            </span>
          </div>
        </div>

        {/* 4. CONNECT */}
        <div className="footer-section footer-connect-section">
          <h3 className="footer-heading">CONNECT</h3>
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

      {/* 5. LEGAL LINKS & COPYRIGHT BAR */}
      <div className="footer-bottom">
        <nav className="footer-legal-links" aria-label="Legal policies">
          <Link to="/privacy-policy" className="footer-legal-link">
            Privacy Policy
          </Link>
          <span className="footer-legal-divider" aria-hidden="true">·</span>
          <Link to="/terms-and-conditions" className="footer-legal-link">
            Terms &amp; Conditions
          </Link>
        </nav>
        <p className="footer-copyright">
          © {new Date().getFullYear()} Haroon Stores. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
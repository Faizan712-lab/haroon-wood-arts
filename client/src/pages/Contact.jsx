import "./Contact.css";

import { FaPhoneAlt, FaWhatsapp } from "react-icons/fa";
import gmailIcon from "../assets/gmail-icon.svg";
import googleMapsIcon from "../assets/google-maps-icon.svg";

function Contact() {
  return (
    <div className="contact-page">
      <div className="contact-hero">
        <span className="contact-tag">GET IN TOUCH</span>
        <h1>Contact Haroon Stores</h1>
        <p className="contact-subtitle">
          We would love to hear from you. Reach out for orders, custom woodwork,
          collaborations, or any questions.
        </p>
      </div>

      <div className="contact-container">
        <div className="contact-card">
          <div className="contact-grid">
            {/* Phone */}
            <div className="contact-item">
              <div className="contact-icon-wrapper" aria-hidden="true">
                <FaPhoneAlt className="contact-icon-phone" />
              </div>
              <div className="contact-item-body">
                <h3>Call Us</h3>
                <a href="tel:+919697010949" className="contact-link">
                  +91-9697010949
                </a>
                <p className="contact-subtext">Mon – Sat: 9:00 AM – 8:00 PM</p>
              </div>
            </div>

            {/* Email */}
            <div className="contact-item">
              <div className="contact-icon-wrapper" aria-hidden="true">
                <img
                  src={gmailIcon}
                  alt="Email"
                  className="contact-icon-img"
                />
              </div>
              <div className="contact-item-body">
                <h3>Email Us</h3>
                <a href="mailto:malikafridi258@gmail.com" className="contact-link">
                  malikafridi258@gmail.com
                </a>
                <p className="contact-subtext">Direct customer assistance</p>
              </div>
            </div>

            {/* Location */}
            <div className="contact-item">
              <div className="contact-icon-wrapper" aria-hidden="true">
                <img
                  src={googleMapsIcon}
                  alt="Location"
                  className="contact-icon-img"
                />
              </div>
              <div className="contact-item-body">
                <h3>Our Location</h3>
                <p className="contact-address">
                  Shalimar, Opposite Shalimar Garden, 190025, Srinagar, Jammu &amp; Kashmir, India
                </p>
                <a
                  href="https://maps.app.goo.gl/T8WnYUjhbrfDSqEu7?g_st=aw"
                  target="_blank"
                  rel="noreferrer"
                  className="map-link"
                >
                  View on Google Maps &rarr;
                </a>
              </div>
            </div>
          </div>

          {/* WhatsApp Direct Action */}
          <div className="contact-action-row">
            <a
              href="https://wa.me/919697010949"
              target="_blank"
              rel="noreferrer"
              className="whatsapp-btn"
              aria-label="Chat on WhatsApp"
            >
              <FaWhatsapp className="whatsapp-logo" aria-hidden="true" />
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contact;

import "./Contact.css";

import {
  FaEnvelope,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaWhatsapp
} from "react-icons/fa";

function Contact() {

  return (

    <div className="contact-page">

      <div className="contact-hero">

        <span className="contact-tag">
          GET IN TOUCH
        </span>

        <h1>
          Contact Haroon Stores
        </h1>

        <p className="contact-subtitle">
          We would love to hear from you.
          Reach out for orders, support,
          collaborations, or any questions.
        </p>

      </div>

      <div className="contact-container">

        <div className="contact-card">

          <div className="contact-item">

            <div className="contact-icon">
              <FaEnvelope />
            </div>

            <div>
              <h3>Email Us</h3>
              <p>haroonstores@gmail.com</p>
            </div>

          </div>

          <div className="contact-item">

            <div className="contact-icon">
              <FaPhoneAlt />
            </div>

            <div>
              <h3>Call Us</h3>
              <p>+91-9697010949</p>
            </div>

          </div>

          <div className="contact-item">

            <div className="contact-icon">
              <FaMapMarkerAlt />
            </div>

            <div>
              <h3>Location</h3>
              <a
                href="https://maps.app.goo.gl/T8WnYUjhbrfDSqEu7?g_st=aw"
                target="_blank"
                rel="noreferrer"
                className="map-link"
              >
                View On Google Maps
              </a>
            </div>

          </div>

          <a
            href="https://wa.me/919697010949"
            target="_blank"
            rel="noreferrer"
            className="whatsapp-btn"
          >
            <FaWhatsapp className="whatsapp-logo" />
            Chat On WhatsApp
          </a>

        </div>

      </div>

    </div>

  );

}

export default Contact;

import "./PolicyPage.css";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";

function PrivacyPolicy() {
  return (
    <>
      <main className="policy-page">
        <div className="policy-container">
          {/* Breadcrumbs */}
          <nav className="policy-breadcrumbs" aria-label="Breadcrumb">
            <Link to="/" className="policy-breadcrumb-link">
              Home
            </Link>
            <span className="policy-breadcrumb-separator" aria-hidden="true">
              /
            </span>
            <span className="policy-breadcrumb-current">Privacy Policy</span>
          </nav>

          {/* Hero Header */}
          <header className="policy-hero">
            <span className="policy-tag">Privacy &amp; Data Protection</span>
            <h1>Privacy Policy</h1>
            <p className="policy-subtitle">
              Learn how Haroon Stores collects, uses, protects, and handles your
              personal information when you browse our website, create an account,
              purchase handcrafted Kashmiri goods, or request support.
            </p>
          </header>

          {/* Key Highlights Callout */}
          <section className="policy-highlight-card" aria-label="Privacy Highlights">
            <h2 className="policy-highlight-title">Privacy At A Glance</h2>
            <ul className="policy-highlight-list">
              <li>
                <strong>No Sensitive Card Storage:</strong> We never collect or
                store complete credit/debit card numbers, CVVs, or UPI PINs.
                All electronic transactions are processed securely through Razorpay.
              </li>
              <li>
                <strong>Confidential Return Photos:</strong> Evidence photographs
                submitted for return requests are reviewed solely by authorized store
                personnel to evaluate product claims and are never displayed publicly.
              </li>
              <li>
                <strong>No Data Selling:</strong> We do not sell, rent, or trade your
                personal information to third-party advertisers. Data is shared only
                with necessary operational partners (payment gateways, courier logistics).
              </li>
            </ul>
          </section>

          {/* Main Policy Content Card */}
          <article className="policy-card">
            {/* Section A: Introduction */}
            <section className="policy-section" id="introduction">
              <div className="policy-section-header">
                <span className="policy-section-num">1</span>
                <h2>Introduction</h2>
              </div>
              <p>
                Welcome to Haroon Stores (accessible at{" "}
                <a
                  href="https://www.haroonstores.in"
                  target="_blank"
                  rel="noreferrer"
                  className="policy-breadcrumb-link"
                >
                  https://www.haroonstores.in
                </a>
                ). Haroon Stores is an e-commerce platform dedicated to offering
                authentic Kashmiri handcrafted wooden decor, traditional artisan
                crafts, carved walnut wood items, and artistic home goods directly
                from Kashmir to customers across India.
              </p>
              <p>
                This Privacy Policy explains how Haroon Stores (&ldquo;we&rdquo;,
                &ldquo;our&rdquo;, or &ldquo;us&rdquo;) collects, uses, stores, and
                shares your information when you visit our website, register a customer
                account, place orders, complete payments, contact customer service, or
                submit return requests. We encourage you to read this policy carefully
                to understand our privacy practices.
              </p>
            </section>

            {/* Section B: Information We Collect */}
            <section className="policy-section" id="information-collected">
              <div className="policy-section-header">
                <span className="policy-section-num">2</span>
                <h2>Information We Collect</h2>
              </div>
              <p>
                To provide our online shopping services, fulfill customer orders, and
                maintain store security, we collect information that you provide
                directly to us, as well as limited technical information generated
                during your visit:
              </p>
              <ul className="policy-list">
                <li>
                  <strong>Contact &amp; Identification Details:</strong> Full name,
                  email address, and mobile phone number provided during account
                  registration, checkout, or customer enquiries.
                </li>
                <li>
                  <strong>Delivery &amp; Shipping Addresses:</strong> Street address,
                  apartment/suite, city, state, postal PIN code, and recipient
                  contact details required to deliver your orders.
                </li>
                <li>
                  <strong>Account &amp; Authentication Credentials:</strong> Login
                  email and securely hashed passwords for local accounts. If you
                  choose to authenticate using Google Sign-In, we receive your
                  verified Google account name, email address, and profile picture URL.
                </li>
                <li>
                  <strong>Order &amp; Purchase History:</strong> Details of items
                  purchased, order dates, total amounts, chosen payment method, order
                  status, and tracking identifiers.
                </li>
                <li>
                  <strong>Payment Transaction References:</strong> Gateway payment
                  identifiers (such as Razorpay Order ID and Payment ID), transaction
                  status (e.g. Captured, Pending, Failed), and payment method category.
                </li>
                <li>
                  <strong>Return Evidence &amp; Customer Support Submissions:</strong>{" "}
                  Reason for return, customer feedback or damage descriptions, and
                  photographs uploaded by you to support return or replacement requests.
                </li>
                <li>
                  <strong>Customer Enquiry Information:</strong> Inquiries, messages,
                  and feedback submitted through our Contact Us form, email, or WhatsApp.
                </li>
                <li>
                  <strong>Technical &amp; Log Information:</strong> Standard web server
                  logs including IP address, browser type, operating system, and
                  timestamps for system security, fraud detection, and diagnostics.
                </li>
              </ul>
              <div className="policy-alert-box">
                <p>
                  <strong>Important Payment Security Notice:</strong> Haroon Stores does{" "}
                  <strong>NOT</strong> collect, view, or store full credit or debit
                  card numbers, CVV security codes, UPI PINs, net banking passwords,
                  or other sensitive payment credentials. All electronic payments are
                  entered directly into Razorpay&rsquo;s secure, PCI-DSS compliant
                  payment modal.
                </p>
              </div>
            </section>

            {/* Section C: How We Use Information */}
            <section className="policy-section" id="use-of-information">
              <div className="policy-section-header">
                <span className="policy-section-num">3</span>
                <h2>How We Use Information</h2>
              </div>
              <p>
                We use the information we collect for legitimate business and
                operational purposes, including:
              </p>
              <ul className="policy-list">
                <li>Creating and managing your customer account and profile.</li>
                <li>
                  Processing, confirming, packaging, and dispatching your orders.
                </li>
                <li>
                  Facilitating secure online payments and managing Cash on Delivery
                  advance verification.
                </li>
                <li>
                  Arranging doorstep shipping and communicating delivery status
                  updates.
                </li>
                <li>
                  Responding to customer inquiries, support requests, and feedback.
                </li>
                <li>
                  Evaluating order cancellations, return requests, and refund
                  eligibility.
                </li>
                <li>
                  Reviewing uploaded return photographs to verify reported product
                  defects or transit damage.
                </li>
                <li>
                  Detecting, investigating, and preventing fraud, unauthorized
                  transactions, and abusive account activity.
                </li>
                <li>
                  Ensuring website security, debugging technical issues, and
                  enhancing your browsing experience.
                </li>
                <li>
                  Complying with applicable accounting, tax, and legal requirements
                  in India.
                </li>
              </ul>
            </section>

            {/* Section D: Payments and Razorpay */}
            <section className="policy-section" id="payments-and-razorpay">
              <div className="policy-section-header">
                <span className="policy-section-num">4</span>
                <h2>Payments and Razorpay Integration</h2>
              </div>
              <p>
                Haroon Stores utilizes Razorpay Software Private Limited
                (&ldquo;Razorpay&rdquo;) as its authorized online payment gateway.
                Depending on the payment method selected at checkout:
              </p>
              <ul className="policy-list">
                <li>
                  <strong>Full Online Payment:</strong> You may pay the entire order
                  amount online using debit/credit cards, UPI, net banking, or
                  supported digital wallets. The transaction is handled directly on
                  Razorpay&rsquo;s encrypted checkout interface.
                </li>
                <li>
                  <strong>Cash on Delivery (COD) with 10% Advance:</strong> To confirm
                  authentic Cash on Delivery orders, customers pay a 10% advance deposit
                  online through Razorpay at the time of order placement. The remaining
                  90% balance is payable in cash or supported courier payment options
                  upon physical delivery.
                </li>
              </ul>
              <p>
                When you initiate payment, Razorpay processes your transaction according
                to its own security standards and privacy policy. Razorpay verifies the
                payment cryptographic signature and returns verification tokens to our
                backend to confirm whether the transaction was successful.
              </p>
              <p>
                While we work with reputable, industry-certified payment partners and
                use encrypted HTTPS transmission, please be aware that no method of
                electronic data transmission over the Internet can be guaranteed as
                100% impenetrable.
              </p>
            </section>

            {/* Section E: Return Photographs */}
            <section className="policy-section" id="return-photographs">
              <div className="policy-section-header">
                <span className="policy-section-num">5</span>
                <h2>Customer Return Photographs</h2>
              </div>
              <p>
                When you submit a return request through your Haroon Stores account,
                you are requested to provide clear photographs of the delivered product,
                including close-ups of any reported defects, damage, or discrepancies.
              </p>
              <p>Please note the following regarding submitted return photographs:</p>
              <ul className="policy-list">
                <li>
                  <strong>Purpose:</strong> Photographs are used solely to assess the
                  validity of your return claim and evaluate the product&rsquo;s
                  physical condition against our return criteria.
                </li>
                <li>
                  <strong>Administrative Review:</strong> Only authorized store
                  administrators review these photographs to determine whether a return
                  or replacement should be approved.
                </li>
                <li>
                  <strong>Confidentiality:</strong> Return evidence is considered private
                  customer correspondence and will never be published, shared
                  publicly, or used for promotional purposes.
                </li>
                <li>
                  <strong>Access Limitation:</strong> Access to return evidence is
                  strictly restricted to personnel who need it to process your claim.
                </li>
                <li>
                  <strong>Retention:</strong> Return evidence is retained in connection
                  with your order record for as long as necessary to process the
                  dispute, handle logistics, complete refunds, and maintain accurate
                  business transaction logs.
                </li>
              </ul>
            </section>

            {/* Section F: Sharing of Information */}
            <section className="policy-section" id="sharing-of-information">
              <div className="policy-section-header">
                <span className="policy-section-num">6</span>
                <h2>Sharing of Information</h2>
              </div>
              <p>
                Haroon Stores does not sell, lease, or monetize customer personal data.
                We share your data only with third parties strictly necessary to deliver
                our products and run our store:
              </p>
              <ul className="policy-list">
                <li>
                  <strong>Payment Gateways (Razorpay):</strong> To process online
                  payments, verify transaction signatures, and facilitate refunds.
                </li>
                <li>
                  <strong>Courier &amp; Logistics Partners:</strong> To deliver your
                  ordered packages, we share recipient name, delivery address, and
                  contact phone number with reputable courier providers.
                </li>
                <li>
                  <strong>Cloud Infrastructure &amp; Image Storage:</strong> We use
                  secure hosting and media cloud infrastructure (such as Cloudinary for
                  optimized image storage) to host product imagery and store return
                  evidence.
                </li>
                <li>
                  <strong>Authorized Store Administrators:</strong> Internal personnel
                  responsible for order packaging, customer assistance, and return
                  approvals.
                </li>
                <li>
                  <strong>Legal &amp; Regulatory Authorities:</strong> We may disclose
                  information if required by applicable Indian law, court order, or
                  statutory governmental authority.
                </li>
              </ul>
            </section>

            {/* Section G: Data Security */}
            <section className="policy-section" id="data-security">
              <div className="policy-section-header">
                <span className="policy-section-num">7</span>
                <h2>Data Security</h2>
              </div>
              <p>
                We implement reasonable administrative, technical, and physical
                safeguards to protect your personal information against unauthorized
                access, accidental loss, alteration, or disclosure. These measures include
                encrypted HTTPS transmission, password hashing, token-based session
                security, and restricted administrative database access.
              </p>
              <p>
                However, no Internet-based system or storage mechanism is completely
                invulnerable. While we make every reasonable effort to protect your
                data, we cannot guarantee absolute, infallible security. We advise you to
                keep your account credentials confidential and log out after using shared
                devices.
              </p>
            </section>

            {/* Section H: Data Retention */}
            <section className="policy-section" id="data-retention">
              <div className="policy-section-header">
                <span className="policy-section-num">8</span>
                <h2>Data Retention</h2>
              </div>
              <p>
                We retain your personal information for as long as your account remains
                active or as necessary to fulfill orders, provide customer service,
                resolve disputes, enforce our agreements, and satisfy statutory tax,
                accounting, and legal recordkeeping requirements.
              </p>
              <p>
                When data is no longer required for operational, legal, or dispute
                purposes, it is either safely deleted or anonymized in accordance with
                standard operational procedures.
              </p>
            </section>

            {/* Section I: Customer Rights and Contact */}
            <section className="policy-section" id="customer-rights">
              <div className="policy-section-header">
                <span className="policy-section-num">9</span>
                <h2>Your Rights &amp; How To Contact Us</h2>
              </div>
              <p>
                You have the right to access, review, and update your personal contact
                and shipping information at any time by logging into your account and
                visiting the Profile section.
              </p>
              <p>
                If you have questions, concerns, or requests regarding this Privacy
                Policy or your personal information, you may contact Haroon Stores
                directly through any of our verified contact channels:
              </p>

              <div className="policy-contact-grid">
                <div className="policy-contact-card">
                  <span className="policy-contact-label">Phone &amp; WhatsApp</span>
                  <a href="tel:+919697010949" className="policy-contact-value">
                    +91-9697010949
                  </a>
                </div>

                <div className="policy-contact-card">
                  <span className="policy-contact-label">Email Address</span>
                  <a
                    href="mailto:malikafridi258@gmail.com"
                    className="policy-contact-value"
                  >
                    malikafridi258@gmail.com
                  </a>
                </div>

                <div className="policy-contact-card">
                  <span className="policy-contact-label">Physical Address</span>
                  <span className="policy-contact-value">
                    Shalimar, Opposite Shalimar Garden, 190025, Srinagar, Jammu &amp;
                    Kashmir, India
                  </span>
                </div>
              </div>
            </section>

            {/* Section J: Policy Updates */}
            <section className="policy-section" id="policy-updates">
              <div className="policy-section-header">
                <span className="policy-section-num">10</span>
                <h2>Policy Updates</h2>
              </div>
              <p>
                Haroon Stores reserves the right to revise or update this Privacy Policy
                as our services, technology, or legal requirements evolve. Any changes
                will be posted directly on this page with an updated &ldquo;Last
                Updated&rdquo; date. We encourage you to review this policy periodically
                to stay informed about our data protection practices.
              </p>
            </section>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default PrivacyPolicy;


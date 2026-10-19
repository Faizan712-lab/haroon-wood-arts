import "./PolicyPage.css";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";

function TermsAndConditions() {
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
            <span className="policy-breadcrumb-current">Terms &amp; Conditions</span>
          </nav>

          {/* Hero Header */}
          <header className="policy-hero">
            <span className="policy-tag">Terms of Service</span>
            <h1>Terms &amp; Conditions</h1>
            <p className="policy-subtitle">
              Please review these Terms &amp; Conditions carefully before purchasing
              from Haroon Stores. They define your rights and responsibilities when
              browsing our store, purchasing our handcrafted woodwork, and using our
              services.
            </p>
          </header>

          {/* Key Highlights Callout */}
          <section className="policy-highlight-card" aria-label="Key Terms Highlights">
            <h2 className="policy-highlight-title">Important Customer Terms</h2>
            <ul className="policy-highlight-list">
              <li>
                <strong>Five-Day Return Window:</strong> Return requests must be
                submitted within <strong>FIVE (5) CALENDAR DAYS</strong> from the date
                the order is delivered. Requests submitted after this window are not
                eligible for return.
              </li>
              <li>
                <strong>Admin Photo Review:</strong> All return requests require
                clear photographic evidence and are reviewed and approved by an
                authorized administrator before any return or refund is processed.
              </li>
              <li>
                <strong>Payment Options:</strong> We support 100% online payment via
                Razorpay, and Cash on Delivery with a 10% advance deposit via Razorpay
                and 90% balance payable upon delivery.
              </li>
              <li>
                <strong>Handcrafted Nature:</strong> Our products are handmade by
                Kashmiri artisans; minor natural wood variations are normal and celebrated.
              </li>
            </ul>
          </section>

          {/* Main Terms Content Card */}
          <article className="policy-card">
            {/* Section A: About the Store */}
            <section className="policy-section" id="about-store">
              <div className="policy-section-header">
                <span className="policy-section-num">1</span>
                <h2>About Haroon Stores</h2>
              </div>
              <p>
                Haroon Stores (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;)
                operates the e-commerce store accessible at{" "}
                <a
                  href="https://haroonstores.in"
                  target="_blank"
                  rel="noreferrer"
                  className="policy-breadcrumb-link"
                >
                  https://haroonstores.in
                </a>
                . We specialize in authentic Kashmiri wooden handicrafts, traditional
                walnut wood carvings, home decor, artistic accessories, and handmade
                items inspired by the artistic heritage of Jammu &amp; Kashmir.
              </p>
              <p>
                By accessing our website, creating an account, or placing an order,
                you agree to be bound by these Terms &amp; Conditions, together with our
                Privacy Policy. If you do not agree with any part of these terms, please
                refrain from using our website or placing orders.
              </p>
            </section>

            {/* Section B: Product Information and Quality */}
            <section className="policy-section" id="product-information">
              <div className="policy-section-header">
                <span className="policy-section-num">2</span>
                <h2>Product Information &amp; Handcrafted Quality</h2>
              </div>
              <p>
                We take pride in presenting accurate product photographs, descriptions,
                dimensions, and pricing on our online store.
              </p>
              <p>
                <strong>Handcrafted Nature &amp; Natural Variations:</strong> Because
                our items are individually created and carved by skilled artisans using
                genuine wood and natural materials, slight variations in wood grain,
                natural knots, shade, finish, texture, or hand-carved detailing may
                occur. These nuances are inherent hallmarks of handmade craftsmanship
                and make each piece distinct.
              </p>
              <p>
                However, this handcrafted variation is never used to excuse an item
                that is defective, damaged in transit, or materially different from what
                was ordered. If you receive an item with legitimate defects or transit
                damage, you may raise a concern through our customer support or return
                process within the specified window.
              </p>
            </section>

            {/* Section C: Orders and Order Confirmation */}
            <section className="policy-section" id="orders-and-confirmation">
              <div className="policy-section-header">
                <span className="policy-section-num">3</span>
                <h2>Orders &amp; Order Confirmation</h2>
              </div>
              <p>The order process operates as follows:</p>
              <ol className="policy-ordered-list">
                <li>
                  <strong>Product Selection &amp; Submission:</strong> You select the
                  desired items, provide delivery details, and submit your order
                  through our checkout page.
                </li>
                <li>
                  <strong>System Recording:</strong> Our system logs the order and
                  assigns a unique Order ID to track your purchase.
                </li>
                <li>
                  <strong>Payment Verification:</strong> For online orders, payments
                  must be successfully processed and verified through Razorpay. For
                  Cash on Delivery orders, the 10% advance deposit must be verified.
                </li>
                <li>
                  <strong>Order Management &amp; Tracking:</strong> You can monitor your
                  order status, tracking details, and available actions anytime in the
                  Orders section of your account.
                </li>
              </ol>
              <p>
                Please note that an order is not finalized or dispatched solely
                because a customer views a payment success screen. All orders remain
                subject to server-side payment verification, inventory confirmation, and
                order processing. We may contact you via phone, email, or WhatsApp if any
                clarification is needed regarding your order or shipping address.
              </p>
            </section>

            {/* Section D: Pricing and Availability */}
            <section className="policy-section" id="pricing-and-availability">
              <div className="policy-section-header">
                <span className="policy-section-num">4</span>
                <h2>Pricing &amp; Availability</h2>
              </div>
              <p>
                All prices listed on our website are in Indian Rupees (INR). Prices and
                item availability are subject to change without prior notice prior to
                order placement.
              </p>
              <p>
                The total amount payable, including item pricing and any applicable
                delivery charges, is displayed clearly in the order summary before you
                complete payment. We do not apply hidden fees or unannounced charges.
              </p>
            </section>

            {/* Section E: Payment Policy */}
            <section className="policy-section" id="payment-policy">
              <div className="policy-section-header">
                <span className="policy-section-num">5</span>
                <h2>Payment Policy</h2>
              </div>
              <p>Haroon Stores supports two payment methods:</p>
              <ul className="policy-list">
                <li>
                  <strong>Full Online Payment:</strong> The customer pays 100% of the
                  order total online at checkout via Razorpay using debit/credit
                  cards, UPI, net banking, or supported wallets.
                </li>
                <li>
                  <strong>Cash on Delivery (COD) with 10% Advance:</strong> To confirm
                  genuine delivery intent, COD orders require a 10% advance payment
                  processed securely via Razorpay at checkout. The remaining 90% of the
                  order balance is payable upon delivery to the courier partner.
                </li>
              </ul>
              <p>
                All electronic transactions are processed by Razorpay. Haroon Stores does
                not store or handle your sensitive card credentials or UPI PINs. Order
                status and fulfillment remain strictly subject to successful
                server-side verification of payment tokens.
              </p>
            </section>

            {/* Section F: Return Policy — FIVE-DAY WINDOW */}
            <section className="policy-section" id="return-policy">
              <div className="policy-section-header">
                <span className="policy-section-num">6</span>
                <h2>Return Policy — Strict Five-Day Calendar Window</h2>
              </div>

              <div className="policy-alert-box">
                <p>
                  <strong>CRITICAL REQUIREMENT:</strong> Return requests must be
                  submitted within <strong>FIVE (5) CALENDAR DAYS</strong> from the date
                  the order is marked as delivered.
                </p>
                <p>
                  Once this five-calendar-day window has expired, the order is no longer
                  eligible for return or replacement under our standard return policy.
                </p>
              </div>

              <p>
                If your delivered item has manufacturing defects, transport damage, or
                is materially different from what was ordered, you must follow this
                return process within the five-day window:
              </p>
              <ol className="policy-ordered-list">
                <li>
                  Log in to your account and navigate to the <strong>Orders</strong>{" "}
                  page, then select the delivered order to open{" "}
                  <strong>Order Details</strong>.
                </li>
                <li>
                  Click the <strong>Request Return</strong> button (available only
                  within 5 calendar days of order delivery).
                </li>
                <li>
                  Select the applicable return reason and provide an honest, detailed
                  description of the issue.
                </li>
                <li>
                  Upload clear, high-resolution photographs illustrating the condition
                  of the item, packaging, and specific defect or damage.
                </li>
                <li>Submit the return request for evaluation.</li>
                <li>
                  An authorized Haroon Stores administrator will review the request and
                  submitted evidence to decide whether the claim meets our return
                  criteria.
                </li>
                <li>
                  You will receive an update in your Orders dashboard and via your
                  registered contact details. If approved, pickup arrangements or
                  next steps will be scheduled.
                </li>
              </ol>
              <p>
                <strong>Important Notice:</strong> Submitting a return request does{" "}
                <strong>not</strong> guarantee or constitute automatic approval. Every
                request is independently evaluated on its merits.
              </p>
            </section>

            {/* Section G: Return Photograph Review and Approval */}
            <section className="policy-section" id="photograph-review">
              <div className="policy-section-header">
                <span className="policy-section-num">7</span>
                <h2>Return Photograph Review &amp; Approval</h2>
              </div>
              <p>
                Clear photographic evidence is required when submitting a return request.
                Our administrators rely on these images to evaluate the physical state
                of the product, assess reported defects, and confirm transit damage
                versus misuse.
              </p>
              <p>
                Approval is determined solely based on the submitted evidence, the
                product condition, order history, and the terms of this policy. Requests
                submitted without clear photographic evidence or with evidence that does
                not corroborate the claimed defect may be rejected by the administrator.
              </p>
            </section>

            {/* Section H: Return Eligibility and Product Condition */}
            <section className="policy-section" id="return-eligibility">
              <div className="policy-section-header">
                <span className="policy-section-num">8</span>
                <h2>Return Eligibility &amp; Product Condition</h2>
              </div>
              <p>To qualify for a successful return approval:</p>
              <ul className="policy-list">
                <li>
                  The return request must be submitted within 5 calendar days of
                  delivery.
                </li>
                <li>
                  The customer must provide accurate information and clear, authentic
                  photographs showing the problem.
                </li>
                <li>
                  The item should be preserved in the condition in which it arrived,
                  along with its original packaging, documentation, and accessories,
                  until the return request has been reviewed and decided.
                </li>
                <li>
                  Items that show signs of post-delivery alteration, chemical exposure,
                  mishandling, or intentional damage are not eligible for return.
                </li>
              </ul>
              <p>
                Nothing in this section is intended to exclude or diminish any mandatory
                consumer protection rights you hold under applicable Indian consumer
                laws.
              </p>
            </section>

            {/* Section I: Refunds */}
            <section className="policy-section" id="refunds">
              <div className="policy-section-header">
                <span className="policy-section-num">9</span>
                <h2>Refund Policy</h2>
              </div>
              <p>
                When a return is approved, pickup completed, and the item safely received
                and verified at our facility:
              </p>
              <ul className="policy-list">
                <li>
                  The order status is updated to &ldquo;Return Completed&rdquo; and
                  refund processing is initiated.
                </li>
                <li>
                  <strong>Prepaid Orders:</strong> Refunds are credited back to the
                  original payment method (card, bank account, UPI) through Razorpay.
                </li>
                <li>
                  <strong>Cash on Delivery Orders:</strong> Any approved refund for the
                  10% advance deposit or total order amount is processed according to the
                  specific return determination and customer-provided bank details or
                  supported transfer methods.
                </li>
              </ul>
              <p>
                Refund processing timelines are subject to banking hours and payment
                provider clearing times. While we initiate approved refunds promptly,
                exact credit posting times may vary depending on your issuing bank.
              </p>
            </section>

            {/* Section J: Order Cancellation */}
            <section className="policy-section" id="order-cancellation">
              <div className="policy-section-header">
                <span className="policy-section-num">10</span>
                <h2>Order Cancellation</h2>
              </div>
              <p>
                Customers may request order cancellation directly through the website
                only while the order is in its initial status (e.g. Placed, Pending, or
                Payment Pending), before the order has entered packing or dispatch.
              </p>
              <p>
                Once an order has been packed, shipped, or handed over to our courier
                partner, it cannot be cancelled via the website cancellation button. In
                such cases, the customer should receive the order and, if eligible,
                follow the standard 5-calendar-day return procedure.
              </p>
            </section>

            {/* Section K: Customer Responsibilities */}
            <section className="policy-section" id="customer-responsibilities">
              <div className="policy-section-header">
                <span className="policy-section-num">11</span>
                <h2>Customer Responsibilities</h2>
              </div>
              <p>When using Haroon Stores, you agree to:</p>
              <ul className="policy-list">
                <li>
                  Provide accurate, truthful, and complete personal details, contact
                  numbers, and delivery addresses.
                </li>
                <li>
                  Maintain the confidentiality of your account credentials and password.
                </li>
                <li>
                  Notify us immediately if you suspect unauthorized access to your
                  account.
                </li>
                <li>
                  Refrain from using our website for fraudulent, abusive, or unlawful
                  activities.
                </li>
              </ul>
            </section>

            {/* Section L: Website Content and Intellectual Property */}
            <section className="policy-section" id="intellectual-property">
              <div className="policy-section-header">
                <span className="policy-section-num">12</span>
                <h2>Website Content &amp; Intellectual Property</h2>
              </div>
              <p>
                All content published on Haroon Stores—including product descriptions,
                woodwork photography, logos, branding, graphics, icons, and website
                source code—is the property of Haroon Stores or its content providers
                and is protected by applicable Indian intellectual property and
                copyright laws.
              </p>
              <p>
                You may not copy, reproduce, scrape, modify, distribute, or create
                derivative works from our website content without prior written
                authorization from Haroon Stores.
              </p>
            </section>

            {/* Section M: Liability and Applicable Law */}
            <section className="policy-section" id="liability-and-law">
              <div className="policy-section-header">
                <span className="policy-section-num">13</span>
                <h2>Limitation of Liability &amp; Applicable Law</h2>
              </div>
              <p>
                Haroon Stores strives to keep website descriptions, inventory, and
                services reliable and current. However, we do not warrant that our
                online store will be entirely uninterrupted, error-free, or free of
                minor technical glitches at all times.
              </p>
              <p>
                To the fullest extent permitted under applicable law, Haroon Stores
                shall not be liable for indirect, incidental, special, or consequential
                damages arising from website downtime, courier transit delays due to
                unforeseen weather or logistics disruptions, or circumstances beyond our
                reasonable control.
              </p>
              <p>
                These Terms &amp; Conditions are governed by and construed in accordance
                with the laws of India. Any disputes arising under these terms are
                subject to applicable Indian legal remedies and mandatory statutory
                consumer protection provisions.
              </p>
            </section>

            {/* Section N: Contact Information */}
            <section className="policy-section" id="contact-information">
              <div className="policy-section-header">
                <span className="policy-section-num">14</span>
                <h2>Contact Information</h2>
              </div>
              <p>
                If you have questions, feedback, or require assistance regarding these
                Terms &amp; Conditions or your orders, please reach out to us using our
                verified contact channels:
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
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default TermsAndConditions;


import Link from "next/link";
import PublicSiteShell from "@/components/public-site/PublicSiteShell";
import BuyerEnquiryForm from "@/components/public-site/BuyerEnquiryForm";
import { publicMetadata } from "@/components/public-site/site-metadata";
import "./real-estate.css";

export const metadata = publicMetadata(
  "Property Development & Homes for Sale in Ghana",
  "Explore Rexy Blocks Factory's property development and home-sales plans in Ghana. Register your buying preferences and enquire with our team.",
  "/real-estate"
);

const journey = [
  {
    number: "01",
    title: "Tell us your plans",
    description: "Share your preferred city, type of home, budget and when you hope to buy. You can enquire from Ghana or from abroad.",
  },
  {
    number: "02",
    title: "Review verified options",
    description: "Our team can discuss any confirmed opportunities and provide relevant property information when available. No property is reserved by an enquiry.",
  },
  {
    number: "03",
    title: "Check before committing",
    description: "Arrange a viewing and independently verify ownership, title, approvals, sale terms and payment instructions before entering an agreement.",
  },
];

export default function RealEstatePage() {
  return (
    <PublicSiteShell>
      <main className="rf-re">
        <section className="rf-re-hero">
          <div className="rf-container rf-re-hero-grid">
            <div className="rf-re-hero-copy">
              <p className="rf-eyebrow">REXY BLOCKS FACTORY · PROPERTY DEVELOPMENT</p>
              <h1>From strong blocks<br />to <em>lasting homes.</em></h1>
              <p>
                We&apos;re expanding our vision from supplying building materials to developing
                residential properties for sale in Ghana. Tell us what kind of home you&apos;re
                looking for and connect with our team.
              </p>
              <div className="rf-hero-actions">
                <a className="rf-button rf-button-dark" href="#buyer-enquiry">Enquire about buying <span aria-hidden="true">↗</span></a>
                <a className="rf-button rf-button-outline" href="#properties">See property updates</a>
              </div>
              <div className="rf-re-microline">Building materials remain available through the <Link href="/blocks">Rexy Blocks catalogue ↗</Link></div>
            </div>
            <div className="rf-re-visual" role="img" aria-label="Architectural concept illustration representing a future residential development, not an actual property listing">
              <div className="rf-re-sun" />
              <div className="rf-re-architecture">
                <div className="rf-re-house-left"><span /><span /><span /></div>
                <div className="rf-re-house-center"><span /><span /><span /><span /></div>
                <div className="rf-re-house-right"><span /><span /></div>
                <div className="rf-re-ground" />
              </div>
              <div className="rf-re-visual-note"><span>RESIDENTIAL DEVELOPMENT</span><span>Concept illustration — not a listing</span></div>
            </div>
          </div>
        </section>

        <section className="rf-section rf-re-intro">
          <div className="rf-container">
            <div className="rf-section-heading">
              <div>
                <p className="rf-eyebrow">OUR DIRECTION</p>
                <h2>Creating homes.<br />Helping people own.</h2>
                <p>Our real estate focus is on building residential properties and selling homes — not managing rentals.</p>
              </div>
            </div>
            <div className="rf-re-benefits">
              <article><span>01 / DEVELOP</span><h3>Residential development</h3><p>Build homes with thoughtful layouts, sound materials and practical requirements for life in Ghana.</p></article>
              <article><span>02 / SELL</span><h3>Homes for ownership</h3><p>Present completed or planned homes for sale with clear property-specific information once verified.</p></article>
              <article><span>03 / CONNECT</span><h3>Buyers in Ghana and abroad</h3><p>Help interested buyers explain their requirements, ask questions and discuss the next steps directly.</p></article>
            </div>
          </div>
        </section>

        <section className="rf-section rf-re-properties" id="properties">
          <div className="rf-container">
            <div className="rf-section-heading">
              <div>
                <p className="rf-eyebrow">PROPERTY AVAILABILITY</p>
                <h2>Homes for sale.</h2>
                <p>We will publish property-specific listings only when their locations, photos, pricing and sale details are confirmed.</p>
              </div>
              <a href="#buyer-enquiry" className="rf-text-link">Send a buyer enquiry ↗</a>
            </div>
            <div className="rf-re-empty">
              <span className="rf-re-empty-icon" aria-hidden="true">⌂</span>
              <div>
                <h3>No verified properties are listed online yet.</h3>
                <p>Interested in a future home? Send your preferred area, property type and budget. We won&apos;t invent listings, prices or availability.</p>
              </div>
              <a className="rf-button rf-button-dark" href="#buyer-enquiry">Enquire about homes ↗</a>
            </div>
          </div>
        </section>

        <section className="rf-section">
          <div className="rf-container">
            <p className="rf-eyebrow">THE BUYING JOURNEY</p>
            <h2>Make an informed move.</h2>
            <ol className="rf-steps">
              {journey.map((item) => (
                <li key={item.number} className="rf-step">
                  <span className="rf-step-number">{item.number}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="rf-re-enquiry" id="buyer-enquiry">
          <div className="rf-container rf-re-enquiry-grid">
            <div className="rf-re-enquiry-copy">
              <p className="rf-eyebrow">LET&apos;S TALK ABOUT OWNERSHIP</p>
              <h2>Your next home starts<br />with a conversation.</h2>
              <p>Share your buying preferences and we&apos;ll help you start the discussion. This is an enquiry — not a booking, property reservation or purchase agreement.</p>
              <div className="rf-re-contact">
                <p>Talk to our team</p>
                <a href="tel:+233547831902">+233 54 783 1902</a>
                <a href="mailto:rexblocksfactory@gmail.com?subject=Real%20estate%20buyer%20enquiry">rexblocksfactory@gmail.com</a>
              </div>
            </div>
            <div className="rf-re-form-panel">
              <h3>Buyer enquiry</h3>
              <p>Tell us what you are looking to buy in Ghana.</p>
              <BuyerEnquiryForm />
            </div>
          </div>
        </section>
      </main>
    </PublicSiteShell>
  );
}

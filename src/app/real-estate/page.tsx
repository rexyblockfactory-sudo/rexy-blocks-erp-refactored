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
                <Link className="rf-button rf-button-outline" href="/homes-for-sale">Browse homes for sale</Link><Link className="rf-button rf-button-outline" href="/rexy-stays">Explore Rexy Stays</Link>
              </div>
              <div className="rf-re-microline">Building materials remain available through the <Link href="/blocks">Rexy Blocks catalogue ↗</Link></div>
            </div>
            <figure className="rf-re-visual">
              <img
                src="https://images.unsplash.com/photo-1760067537293-6b30141d6a52?auto=format&amp;fit=crop&amp;fm=jpg&amp;q=80&amp;w=1600"
                alt="Contemporary tropical residence with palm trees, wood and stone details, shown as design inspiration"
                width={1600}
                height={1200}
                fetchPriority="high"
              />
              <figcaption className="rf-re-visual-note">
                <span>MODERN HOME INSPIRATION</span>
                <span>Representative photography — not a Rexy property for sale</span>
              </figcaption>
            </figure>
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

        <section className="rf-section rf-re-gallery" aria-label="Modern home design inspiration">
          <div className="rf-container">
            <div className="rf-section-heading">
              <div>
                <p className="rf-eyebrow">LIVING SPACES & ARCHITECTURE</p>
                <h2>Modern design.<br />Beautiful possibilities.</h2>
                <p>Get inspired by contemporary architecture and welcoming interiors. These are stock photographs, not homes built by Rexy or properties currently available to buy.</p>
              </div>
            </div>
            <div className="rf-re-gallery-grid">
              <figure className="rf-re-gallery-card">
                <img
                  src="https://images.unsplash.com/photo-1766603636671-484c4911a84b?auto=format&amp;fit=crop&amp;fm=jpg&amp;q=80&amp;w=1300"
                  alt="Modern tropical home with a green lawn, landscaping and palms, representing an architectural style"
                  width={1300} height={1000} loading="lazy"
                />
                <figcaption><strong>Contemporary exteriors</strong><span>Architecture inspiration · <a href="https://unsplash.com/photos/modern-house-with-palm-trees-and-green-lawn-BnRBFRv2WZA" target="_blank" rel="noopener noreferrer">Photo: Alef Morais / Unsplash ↗</a></span></figcaption>
              </figure>
              <figure className="rf-re-gallery-card">
                <img
                  src="https://images.unsplash.com/photo-1774199679021-db3b421867c3?auto=format&amp;fit=crop&amp;fm=jpg&amp;q=80&amp;w=1300"
                  alt="Bright modern living room with large windows and a view of trees, for interior inspiration"
                  width={1300} height={1000} loading="lazy"
                />
                <figcaption><strong>Welcoming modern interiors</strong><span>Living-space inspiration · <a href="https://unsplash.com/photos/modern-living-room-with-large-windows-overlooking-trees-A9DmoCgM5iw" target="_blank" rel="noopener noreferrer">Photo: Clay Banks / Unsplash ↗</a></span></figcaption>
              </figure>
            </div>
            <p className="rf-image-disclaimer">
              Inspiration photography only. Featured homes and interiors are not Rexy Blocks Factory projects or verified property listings.
              Hero photograph by <a href="https://unsplash.com/photos/modern-house-with-wood-and-stone-exterior-hPu2n_SfV7Q" target="_blank" rel="noopener noreferrer">Alef Morais / Unsplash ↗</a>.
            </p>
          </div>
        </section>

        <section className="rf-section rf-re-properties" id="properties">
          <div className="rf-container">
            <div className="rf-section-heading">
              <div>
                <p className="rf-eyebrow">PROPERTY AVAILABILITY</p>
                <h2>Homes for sale.</h2>
                <p>Explore the homes-for-sale marketplace and our separate Rexy Stays short-stay section. We publish only verified listings with confirmed property-specific details.</p>
              </div>
              <Link href="/homes-for-sale" className="rf-text-link">Browse homes for sale ↗</Link>
            </div>
            <div className="rf-re-empty">
              <span className="rf-re-empty-icon" aria-hidden="true">⌂</span>
              <div>
                <h3>Looking for a home to buy?</h3>
                <p>Browse verified homes for sale, or send your preferred area, property type and budget. Check Rexy Stays for short-stay accommodation enquiries. We never invent properties, prices or availability.</p>
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

import Link from "next/link";
import PublicSiteShell from "@/components/public-site/PublicSiteShell";
import OwnerSubmissionForm from "@/components/public-site/OwnerSubmissionForm";
import { publicMetadata } from "@/components/public-site/site-metadata";
import "../property-marketplace.css";

export const metadata = publicMetadata(
  "List Your Home for Sale, Rent or Short Stays | Rexy Real Estate",
  "Are you a homeowner or authorised representative in Ghana? Ask Rexy Real Estate to review your house for sale, long-term rental or Rexy Stays.",
  "/list-your-property"
);

export default function ListYourPropertyPage() {
  return <PublicSiteShell><main className="rf-mp rf-container rf-mp-owner-page">
    <nav className="rf-mp-crumbs" aria-label="Breadcrumbs"><Link href="/">Home</Link><span>/</span><Link href="/real-estate">Real estate</Link><span>/</span><span>List your property</span></nav>
    <header className="rf-mp-owner-head">
      <p className="rf-eyebrow">FOR HOMEOWNERS, LANDLORDS & HOSTS</p>
      <h1>Have a property?<br/>Let&apos;s get it seen.</h1>
      <p>Sell your home, find a long-term tenant, or propose a furnished property for Rexy Stays. Send us your property details for a private review before anything goes online.</p>
      <div className="rf-mp-owner-choices">
        <div><strong>Sell</strong><span>Reach buyers looking for a home in Ghana.</span></div>
        <div><strong>Long-term rent</strong><span>Share a residential property for prospective tenants.</span></div>
        <div><strong>Short stays</strong><span>Propose furnished accommodation for Rexy Stays.</span></div>
      </div>
    </header>
    <div className="rf-mp-owner-body">
      <section className="rf-mp-owner-panel">
        <h2>Submit your property for review</h2>
        <p>Your submission goes straight to our private review queue. No account, booking or payment is needed.</p>
        <OwnerSubmissionForm/>
      </section>
      <aside className="rf-mp-owner-aside">
        <p className="rf-eyebrow">BEFORE WE PUBLISH</p>
        <h2>Every listing is reviewed.</h2>
        <ol>
          <li><strong>1. Share your home</strong><span>Location, type, construction status and expected price.</span></li>
          <li><strong>2. Verify authority</strong><span>We review ownership or written authority and image rights. We may ask for a site visit.</span></li>
          <li><strong>3. Approve details</strong><span>The price, property specifications, photos and description must be accurate.</span></li>
          <li><strong>4. Publish carefully</strong><span>Only approved, verified listings appear in our public marketplaces.</span></li>
        </ol>
        <p className="rf-mp-owner-aside-note">Payments, rental agreements and booking confirmations are not processed by this enquiry form. We do not guarantee that a submission will be accepted.</p>
      </aside>
    </div>
  </main></PublicSiteShell>;
}

import Link from "next/link";
import PublicSiteShell from "@/components/public-site/PublicSiteShell";
import {
  getPublishedProperties, propertyPath, propertyPrice,
  type PropertyFilters, type PropertyMarket, type PublishedProperty
} from "@/components/public-site/property-data";

const content = {
  sale: {
    eyebrow: "REXY REAL ESTATE · HOMES FOR SALE",
    title: "Find a place to call yours.",
    description: "Explore verified homes available for purchase in Ghana. Compare locations, layouts, and prices before arranging a viewing with our team.",
    label: "Purchase price (GH₵)",
    noResults: "No verified homes match your search.",
    disclaimer: "Enquiries are not property reservations. Confirm title, ownership, pricing and viewing arrangements independently before any payment.",
    inspiration: "Browse home design inspiration",
    inspirationLink: "/real-estate",
  },
  stay: {
    eyebrow: "REXY STAYS · SHORT-STAY HOMES",
    title: "A better way to stay in Ghana.",
    description: "Explore verified furnished homes for short stays. Request dates and guest details directly with our team; reservations are never automatic.",
    label: "Maximum nightly price (GH₵)",
    noResults: "No verified stays match your search.",
    disclaimer: "Nightly prices are indicative until quoted. Availability must be confirmed by our team; submitting an enquiry does not book accommodation or take payment.",
    inspiration: "Ask us about upcoming stays",
    inspirationLink: "https://wa.me/233547831902?text=" + encodeURIComponent("Hello Rexy Stays. I would like to learn about upcoming verified short-stay homes in Ghana."),
  },
};

function PropertyCard({ property }: { property: PublishedProperty }) {
  return <article className="rf-mp-card">
    <Link href={propertyPath(property)} className="rf-mp-card-image" aria-label={"View " + property.title}>
      {property.photo_urls[0] ? (
        <img src={property.photo_urls[0]} alt={"Verified listing photo for " + property.title} loading="lazy" />
      ) : (
        <span className="rf-mp-no-photo">Photographs coming soon</span>
      )}
      <span className="rf-mp-status">Verified listing</span>
    </Link>
    <div className="rf-mp-card-body">
      <p className="rf-mp-location">{property.neighborhood ? property.neighborhood + ", " : ""}{property.city}, {property.region}</p>
      <h2><Link href={propertyPath(property)}>{property.title}</Link></h2>
      <div className="rf-mp-specs">
        <span>{property.bedrooms} beds</span>
        <span>{property.bathrooms} baths</span>
        {property.market === "stay" && property.max_guests !== null && <span>Up to {property.max_guests} guests</span>}
      </div>
      <div className="rf-mp-card-bottom">
        <strong>{propertyPrice(property.price_ghs)}{property.market === "stay" && <small> / night</small>}</strong>
        <Link href={propertyPath(property)} aria-label={"View details for " + property.title}>Details ↗</Link>
      </div>
    </div>
  </article>;
}

export default async function PropertyMarketplace({
  market, filters,
}: {
  market: PropertyMarket;
  filters: PropertyFilters;
}) {
  const copy = content[market];
  const { properties, available } = await getPublishedProperties(market, filters);
  const path = market === "sale" ? "/homes-for-sale" : "/rexy-stays";
  const filtered = Boolean(filters.city || filters.minBeds || filters.maxPrice || filters.guests);
  return <PublicSiteShell><main className="rf-mp">
    <section className={"rf-mp-hero rf-mp-hero-" + market}>
      <div className="rf-container rf-mp-hero-content">
        <p className="rf-eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
        <div className="rf-mp-sister-links">
          <Link href="/real-estate">Property development</Link>
          <Link href="/homes-for-sale" aria-current={market === "sale" ? "page" : undefined}>Homes for sale</Link>
          <Link href="/rexy-stays" aria-current={market === "stay" ? "page" : undefined}>Rexy Stays</Link>
        </div>
      </div>
      <span className="rf-mp-photo-note">Representative architectural photography — not a property listing</span>
    </section>

    <div className="rf-container">
      <form method="get" action={path} className="rf-mp-search" aria-label="Search properties">
        <label>
          City or town
          <input name="city" maxLength={70} type="search" placeholder="e.g. Kumasi" defaultValue={filters.city ?? ""} />
        </label>
        <label>
          Minimum bedrooms
          <select name="beds" defaultValue={filters.minBeds?.toString() ?? ""}>
            <option value="">Any</option>
            {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}+</option>)}
          </select>
        </label>
        <label>
          {copy.label}
          <input name="maxPrice" type="number" min="1" max="999999999" step="1" placeholder="No maximum" defaultValue={filters.maxPrice?.toString() ?? ""} />
        </label>
        {market === "stay" && <label>
          Guests
          <select name="guests" defaultValue={filters.guests?.toString() ?? ""}>
            <option value="">Any</option>
            {[1,2,3,4,5,6,8,10].map(n => <option key={n} value={n}>{n}+</option>)}
          </select>
        </label>}
        <label>
          Sort
          <select name="sort" defaultValue={filters.sort ?? "newest"}>
            <option value="newest">Newest</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
        </label>
        <div className="rf-mp-actions">
          <button className="rf-button rf-button-dark" type="submit">Search ↗</button>
          <Link href={path}>Clear</Link>
        </div>
      </form>
      <section className="rf-mp-results" aria-label="Available verified property listings">
        <div className="rf-mp-results-head">
          <div>
            <p className="rf-eyebrow">VERIFIED PROPERTIES</p>
            <h2>{market === "sale" ? "Homes for sale" : "Short-stay accommodation"}</h2>
            <p>Only properties reviewed and approved for publication appear here.</p>
          </div>
          {available && <span className="rf-mp-count">{properties.length} listings</span>}
        </div>
        {properties.length ? <div className="rf-mp-grid">{properties.map(p => <PropertyCard key={p.id} property={p} />)}</div> :
          <div className="rf-mp-empty">
            <div className="rf-mp-empty-symbol" aria-hidden="true">⌂</div>
            <div>
              <h3>{available ? copy.noResults : "Property listings are being prepared."}</h3>
              <p>{available && filtered ?
                "Try adjusting your search. We only display verified, published listings." :
                "We have not published verified properties in this category yet. Contact our team to discuss your requirements, and check back for confirmed availability."}
              </p>
              {market === "sale" ? <Link href="/real-estate#buyer-enquiry" className="rf-button rf-button-dark">Enquire about buying ↗</Link>
                : <a href={copy.inspirationLink} target="_blank" rel="noopener noreferrer" className="rf-button rf-button-dark">Ask about upcoming stays ↗</a>}
            </div>
          </div>}
        <p className="rf-mp-legal">{copy.disclaimer}</p>
      </section>
    </div>
  </main></PublicSiteShell>;
}

export function parsePropertyFilters(params: Record<string,string|string[]|undefined>): PropertyFilters {
  const stringValue = (name: string) => {
    const value = params[name];
    return typeof value === "string" ? value : "";
  };
  const positiveInt = (name: string) => {
    const raw = stringValue(name);
    if (!/^[0-9]{1,9}$/.test(raw)) return undefined;
    const n = Number(raw);
    return n > 0 && Number.isSafeInteger(n) ? n : undefined;
  };
  const sortRaw = stringValue("sort");
  return {
    city: stringValue("city").slice(0,70).trim(),
    minBeds: positiveInt("beds"),
    maxPrice: positiveInt("maxPrice"),
    guests: positiveInt("guests"),
    sort: sortRaw === "price-low" || sortRaw === "price-high" ? sortRaw : "newest",
  };
}

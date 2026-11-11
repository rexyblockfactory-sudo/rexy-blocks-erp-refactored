import Link from "next/link";
import { notFound } from "next/navigation";
import PublicSiteShell from "@/components/public-site/PublicSiteShell";
import PropertyEnquiryForm from "@/components/public-site/PropertyEnquiryForm";
import { getPublishedProperty, propertyPrice, type PropertyMarket } from "@/components/public-site/property-data";

export default async function PropertyDetail({ market, slug }: { market: PropertyMarket; slug: string }) {
  const property = await getPublishedProperty(market, slug);
  if (!property) notFound();
  const isStay = market === "stay";
  const browsePath = isStay ? "/rexy-stays" : market === "rent" ? "/rentals" : "/homes-for-sale";

  return <PublicSiteShell><main className="rf-mp rf-container rf-mp-detail">
    <nav aria-label="Breadcrumbs" className="rf-mp-crumbs">
      <Link href="/">Home</Link> <span>/</span>
      <Link href={browsePath}>{isStay ? "Rexy Stays" : market === "rent" ? "Homes for rent" : "Homes for sale"}</Link> <span>/</span>
      <span aria-current="page">{property.title}</span>
    </nav>
    <div className="rf-mp-detail-heading">
      <p className="rf-eyebrow">VERIFIED {isStay ? "SHORT-STAY LISTING" : market === "rent" ? "PROPERTY FOR RENT" : "PROPERTY FOR SALE"}</p>
      <h1>{property.title}</h1>
      <p>{property.neighborhood ? property.neighborhood + ", " : ""}{property.city}, {property.region}, Ghana</p>
    </div>
    {property.photo_urls.length > 0 ? (
      <div className={"rf-mp-gallery " + (property.photo_urls.length === 1 ? "rf-mp-gallery-single" : "")}>
        {property.photo_urls.slice(0, 5).map((url, i) =>
          <div key={url + i} className="rf-mp-gallery-photo">
            <img src={url} alt={property.title + " — listing photo " + (i + 1)} loading={i === 0 ? "eager" : "lazy"} />
          </div>
        )}
      </div>
    ) : (
      <div className="rf-mp-photo-empty">
        Photos have not been uploaded for this listing. Request photographs and verify the property before proceeding.
      </div>
    )}
    <div className="rf-mp-detail-columns">
      <div className="rf-mp-description">
        <div className="rf-mp-detail-specs">
          <span>{property.bedrooms} bedrooms</span>
          <span>{property.bathrooms} bathrooms</span>
          {isStay && property.max_guests != null && <span>Up to {property.max_guests} guests</span>}
        </div>
        <h2>{isStay ? "About this stay" : "About this home"}</h2>
        <p className="rf-mp-description-text">{property.description}</p>
        {property.amenities.length > 0 && <>
          <h2>{isStay ? "Amenities" : "Features"}</h2>
          <ul className="rf-mp-amenities">{property.amenities.map((item, i) => <li key={item + i}>{item}</li>)}</ul>
        </>}
        <div className="rf-mp-due-diligence">
          <h3>Important information</h3>
          <p>{isStay ?
            "Availability is not confirmed by this website. Our team must verify requested dates, guest capacity, applicable charges, check-in rules and any required documentation before a booking can be accepted." :
            "A viewing request does not reserve this property. Independently verify ownership documents, planning approvals and property condition; for a rental, review the tenancy agreement and deposit terms before paying anything. Confirm all payment instructions with the company."}
          </p>
        </div>
      </div>
      <aside className="rf-mp-detail-aside">
        <div className="rf-mp-enquiry-panel">
          <p className="rf-mp-panel-kicker">{isStay ? "Advertised nightly rate" : market === "rent" ? "Advertised monthly rent" : "Advertised asking price"}</p>
          <p className="rf-mp-big-price">{propertyPrice(property.price_ghs)}{(isStay || market === "rent") && <small> / {isStay ? "night" : "month"}</small>}</p>
          <p className="rf-mp-panel-subtitle">{isStay ?
            "Rates and availability are subject to confirmation. No online checkout or payment is enabled." :
            "Contact our team to discuss a viewing, property details and the purchase process."}</p>
          <PropertyEnquiryForm property={property} />
        </div>
      </aside>
    </div>
    <div className="rf-mp-return"><Link href={browsePath}>← Back to {isStay ? "stays" : market === "rent" ? "rentals" : "homes for sale"}</Link></div>
  </main></PublicSiteShell>;
}

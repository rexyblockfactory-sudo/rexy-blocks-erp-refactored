"use client";

import { useState, type FormEvent } from "react";

type OfferType = "sale" | "rent" | "stay";

export default function OwnerSubmissionForm() {
  const [offerType, setOfferType] = useState<OfferType>("sale");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [homeType, setHomeType] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [authority, setAuthority] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (name.trim().length < 2 || phone.trim().length < 7 || city.trim().length < 2 ||
        description.trim().length < 20 || !authority || !consent) {
      setError("Complete the required fields and confirm your authority and consent.");
      return;
    }

    const body = [
      "Hello Rexy Real Estate, I would like to submit a home for review.",
      "",
      "Offer type: " + (offerType === "sale" ? "Sell a property" : offerType === "rent" ? "Offer a home for long-term rent" : "Offer a short-stay home"),
      "Contact name: " + name.trim(),
      "Phone / WhatsApp: " + phone.trim(),
      "City: " + city.trim(),
      "Neighborhood: " + (area.trim() || "To discuss"),
      "Property type: " + (homeType.trim() || "To discuss"),
      "Proposed price in GHS: " + (price.trim() || "To discuss"),
      "Description: " + description.trim(),
      "",
      "I confirm that I am the owner or have authority to market this property.",
      "I consent to Rexy Real Estate using these details to contact me about listing review.",
      "Please tell me what documentation and photographs you need to verify the listing.",
      "This message is an enquiry, not a live property advertisement.",
    ].join("\n");

    // Phase one: owner proposals are delivered to the company via WhatsApp,
    // not inserted into a publicly readable table or automatically published.
    window.location.assign("https://wa.me/233547831902?text=" + encodeURIComponent(body));
  }

  return <form className="rf-mp-owner-form" onSubmit={submit}>
    <div className="rf-mp-owner-fields">
      <label>How would you like to list your home?
        <select value={offerType} onChange={e => setOfferType(e.target.value as OfferType)}>
          <option value="sale">Sell a property</option>
          <option value="rent">Rent out a home (long-term)</option>
          <option value="stay">Host short stays through Rexy Stays</option>
        </select>
      </label>
      <label>Full name *
        <input required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Owner or authorised representative" />
      </label>
      <label>Phone / WhatsApp *
        <input required minLength={7} maxLength={30} autoComplete="tel" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+233 or international contact" />
      </label>
      <label>Property city *
        <input required minLength={2} maxLength={80} value={city} onChange={e => setCity(e.target.value)} placeholder="Kumasi, Accra, etc." />
      </label>
      <label>Neighborhood
        <input maxLength={120} value={area} onChange={e => setArea(e.target.value)} placeholder="Area of the property" />
      </label>
      <label>Type of property
        <input maxLength={100} value={homeType} onChange={e => setHomeType(e.target.value)} placeholder="Apartment, townhouse, house, etc." />
      </label>
      <label>Expected {offerType === "sale" ? "sale price" : offerType === "stay" ? "nightly rate" : "monthly rent"} in GH₵ (optional)
        <input inputMode="decimal" maxLength={40} value={price} onChange={e => setPrice(e.target.value)} placeholder="Negotiable / to discuss" />
      </label>
      <label className="rf-mp-owner-wide">Tell us about the property *
        <textarea required minLength={20} maxLength={1800} rows={5} value={description} onChange={e => setDescription(e.target.value)} placeholder="Construction status, number of rooms, facilities and anything buyers, tenants or guests should know" />
      </label>
    </div>
    <label className="rf-mp-owner-agreement">
      <input type="checkbox" required checked={authority} onChange={e => setAuthority(e.target.checked)} />
      I own this property or have explicit authority from the owner to offer it for sale, rent or short stays.
    </label>
    <label className="rf-mp-owner-agreement">
      <input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} />
      I agree to share these details via WhatsApp for Rexy Real Estate to review and contact me. I understand this does not publish a listing.
    </label>
    {error && <p className="rf-mp-owner-error" role="alert">{error}</p>}
    <button type="submit" className="rf-button rf-button-dark rf-mp-owner-submit">Send property for review ↗</button>
    <p className="rf-mp-owner-fine">This opens WhatsApp with a prefilled message you choose to send. Our staff will request proof of ownership or marketing authority and photos separately. Your home will not appear publicly until reviewed, verified and approved. Never share identity documents in public chat groups.</p>
  </form>;
}

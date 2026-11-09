"use client";

import { useState, type FormEvent } from "react";

type BuyerDetails = {
  fullName: string;
  contact: string;
  preferredArea: string;
  homeType: string;
  budget: string;
  timeline: string;
  notes: string;
};

const initialDetails: BuyerDetails = {
  fullName: "",
  contact: "",
  preferredArea: "",
  homeType: "Open to options",
  budget: "",
  timeline: "Exploring options",
  notes: "",
};

export default function BuyerEnquiryForm() {
  const [details, setDetails] = useState<BuyerDetails>(initialDetails);

  function update<K extends keyof BuyerDetails>(field: K, value: BuyerDetails[K]) {
    setDetails((current) => ({ ...current, [field]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = [
      "Hello Rexy Blocks Factory, I would like to enquire about buying a home through your real estate development business.",
      "",
      "Name: " + details.fullName.trim(),
      "Contact: " + details.contact.trim(),
      "Preferred area: " + (details.preferredArea.trim() || "Open to options in Ghana"),
      "Home type: " + details.homeType,
      "Budget (GH₵): " + (details.budget.trim() || "To discuss"),
      "Purchase timeline: " + details.timeline,
      "Additional details: " + (details.notes.trim() || "None"),
      "",
      "Please share any verified properties or development opportunities that may be available, including location, price and viewing details.",
    ].join("\n");

    // Buyer enquiries are sent through WhatsApp only; this does not create an ERP order or sale.
    window.location.assign("https://wa.me/233547831902?text=" + encodeURIComponent(message));
  }

  return (
    <form className="rf-re-form" onSubmit={submit}>
      <div className="rf-re-form-grid">
        <label>
          Full name <span aria-hidden="true">*</span>
          <input type="text" name="fullName" autoComplete="name" required minLength={2} maxLength={100}
            value={details.fullName} onChange={(event) => update("fullName", event.target.value)}
            placeholder="Your full name" />
        </label>
        <label>
          Phone or WhatsApp <span aria-hidden="true">*</span>
          <input type="tel" name="contact" autoComplete="tel" required minLength={7} maxLength={30}
            value={details.contact} onChange={(event) => update("contact", event.target.value)}
            placeholder="+233 or international number" />
        </label>
        <label>
          Preferred location
          <input type="text" name="preferredArea" maxLength={120}
            value={details.preferredArea} onChange={(event) => update("preferredArea", event.target.value)}
            placeholder="e.g. Kumasi or Accra" />
        </label>
        <label>
          Type of home
          <select name="homeType" value={details.homeType} onChange={(event) => update("homeType", event.target.value)}>
            <option>Open to options</option>
            <option>2-bedroom home</option>
            <option>3-bedroom home</option>
            <option>4+ bedroom home</option>
            <option>Townhouse</option>
            <option>Other residential property</option>
          </select>
        </label>
        <label>
          Budget in Ghana cedis (optional)
          <input type="text" name="budget" inputMode="decimal" maxLength={80}
            value={details.budget} onChange={(event) => update("budget", event.target.value)}
            placeholder="Your approximate GH₵ budget" />
        </label>
        <label>
          When are you looking to buy?
          <select name="timeline" value={details.timeline} onChange={(event) => update("timeline", event.target.value)}>
            <option>Exploring options</option>
            <option>As soon as a suitable property is available</option>
            <option>Within 3–6 months</option>
            <option>Within 6–12 months</option>
            <option>More than a year from now</option>
          </select>
        </label>
      </div>
      <label>
        Anything else we should know? (optional)
        <textarea name="notes" rows={4} maxLength={1000}
          value={details.notes} onChange={(event) => update("notes", event.target.value)}
          placeholder="Preferred amenities, location requirements, accessibility, or questions" />
      </label>
      <button className="rf-button rf-button-dark rf-re-submit" type="submit">
        Continue to WhatsApp <span aria-hidden="true">↗</span>
      </button>
      <p className="rf-re-form-help">
        This opens a prefilled WhatsApp enquiry for you to review and send. It does not reserve a property,
        request payment, or create a concrete-block order in the ERP. Please verify property ownership,
        documentation, availability, and sale terms before making any payment.
      </p>
    </form>
  );
}

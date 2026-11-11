"use client";

import { useState, type FormEvent } from "react";
import type { PublishedProperty } from "@/components/public-site/property-data";

export default function PropertyEnquiryForm({ property }: { property: PublishedProperty }) {
  const isStay = property.market === "stay";
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [date, setDate] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guests, setGuests] = useState("1");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const now = new Date();
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (name.trim().length < 2 || contact.trim().length < 7) {
      setError("Please enter a valid name and contact number.");
      return;
    }
    if (isStay) {
      if (!date || !checkout || date < today || checkout <= date) {
        setError("Select a valid check-in and a later check-out date.");
        return;
      }
      const guestCount = Number(guests);
      if (!Number.isSafeInteger(guestCount) || guestCount < 1 || (property.max_guests != null && guestCount > property.max_guests)) {
        setError("Please enter a guest count within the property's stated capacity.");
        return;
      }
    }
    const listingPath = (property.market === "sale" ? "/homes-for-sale/" : property.market === "rent" ? "/rentals/" : "/rexy-stays/") + property.slug;
    const lines = [
      "Hello Rexy " + (isStay ? "Stays" : "Real Estate") + ",",
      isStay ? "I would like to check short-stay availability (not confirm a booking)." : "I would like to request a property viewing (not reserve a property).",
      "",
      "Property: " + property.title,
      "Location: " + property.city + ", " + property.region,
      "Listing: " + window.location.origin + listingPath,
      "Advertised " + (isStay ? "nightly rate" : property.market === "rent" ? "monthly rent" : "sale price") + ": GH₵" + property.price_ghs.toLocaleString("en-GH"),
      "Full name: " + name.trim(),
      "Contact: " + contact.trim(),
    ];
    if (isStay) {
      lines.push("Requested check-in: " + date, "Requested check-out: " + checkout, "Guests: " + guests);
    } else if (date) {
      lines.push("Preferred viewing date: " + date);
    }
    lines.push("Notes: " + (notes.trim() || "None"), "", "Please confirm availability and next steps. No booking or payment has been made.");
    window.location.assign("https://wa.me/233547831902?text=" + encodeURIComponent(lines.join("\n")));
  }

  return <form onSubmit={send} className="rf-mp-enquiry-form">
    <p className="rf-mp-form-notice">{isStay ?
      "Send a date enquiry. Availability and your final quote must be confirmed by our team before any stay is reserved." :
      "Arrange a viewing and verify the property's details before any purchase decision."}</p>
    <label>Full name
      <input required autoComplete="name" minLength={2} maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
    </label>
    <label>Phone or WhatsApp
      <input required autoComplete="tel" type="tel" minLength={7} maxLength={30} value={contact} onChange={e => setContact(e.target.value)} placeholder="+233 or international number" />
    </label>
    <div className="rf-mp-form-row">
      <label>{isStay ? "Check-in date" : "Preferred viewing date (optional)"}
        <input type="date" required={isStay} min={today} value={date} onChange={e => setDate(e.target.value)} />
      </label>
      {isStay && <label>Check-out date
        <input required type="date" min={date || today} value={checkout} onChange={e => setCheckout(e.target.value)} />
      </label>}
    </div>
    {isStay && <label>Number of guests
      <input required min="1" max={property.max_guests ?? 20} type="number" step="1" value={guests} onChange={e => setGuests(e.target.value)} />
    </label>}
    <label>Message (optional)
      <textarea maxLength={1000} rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Your questions and preferences" />
    </label>
    {error && <p role="alert" className="rf-mp-form-error">{error}</p>}
    <button className="rf-button rf-button-dark" type="submit">{isStay ? "Request these dates" : "Request a viewing"} ↗</button>
    <p className="rf-mp-form-fine">Opens WhatsApp with a prefilled message. Review and send it yourself. No payment is collected here, and no property is booked or sold by this form.</p>
  </form>;
}

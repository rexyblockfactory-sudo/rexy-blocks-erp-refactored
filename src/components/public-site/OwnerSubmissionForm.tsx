"use client";

import { useState, type FormEvent } from "react";
import { submissionPhotoLimit, submissionPhotoTotalBytes, type SubmissionMarket } from "@/lib/property-submission-input";

export default function OwnerSubmissionForm() {
  const [market,setMarket]=useState<SubmissionMarket>("sale");
  const [error,setError]=useState("");
  const [reference,setReference]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form=event.currentTarget;
    const body=new FormData(form);
    const files=body.getAll("photos").filter((item):item is File=>typeof item!=="string" && item.size>0);
    if (files.length>submissionPhotoLimit || files.reduce((sum,file)=>sum+file.size,0)>submissionPhotoTotalBytes) {
      setError("Use up to 3 photos totaling no more than 3.8 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res=await fetch("/api/property-submissions",{method:"POST",body});
      const data=await res.json().catch(()=>null);
      if (!res.ok || typeof data?.reference!=="string") {
        throw new Error(data?.error || (res.status===413?"Use smaller photos and try again.":"Could not submit. Try again later."));
      }
      setReference(data.reference);
    } catch (cause) {
      setError(cause instanceof Error?cause.message:"Could not submit. Try again later.");
    } finally { setBusy(false); }
  }

  if (reference) return <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
    <h3 className="text-lg font-semibold">Property submitted for review</h3>
    <p className="mt-2 text-sm">Keep this reference for any follow-up.</p>
    <p className="my-3 break-all font-mono text-sm font-bold">{reference}</p>
    <p className="text-sm">Your submission is private. Nothing is published until an administrator verifies and approves it.</p>
    <button type="button" className="mt-4 text-sm font-semibold underline underline-offset-4" onClick={()=>{setReference("");setMarket("sale");}}>Submit another property</button>
  </div>;

  return <form className="rf-mp-owner-form" onSubmit={submit} encType="multipart/form-data" method="post" action="/api/property-submissions">
    <fieldset disabled={busy} className="rf-mp-owner-fields">
      <label>How would you like to list your home?
        <select name="market" value={market} onChange={e=>setMarket(e.target.value as SubmissionMarket)}>
          <option value="sale">Sell a property</option><option value="rent">Long-term rental</option><option value="stay">Short stay through Rexy Stays</option>
        </select>
      </label>
      <label>Property title *
        <input name="title" required minLength={4} maxLength={160} placeholder="Furnished two-bedroom home" />
      </label>
      <label>Full name *
        <input name="contact_name" required minLength={2} maxLength={100} autoComplete="name" placeholder="Owner or authorised representative" />
      </label>
      <label>Phone or WhatsApp *
        <input name="contact_phone" type="tel" required minLength={7} maxLength={30} autoComplete="tel" placeholder="+233 …" />
      </label>
      <label>City or town *
        <input name="city" required minLength={2} maxLength={80} placeholder="Kumasi, Accra, etc." />
      </label>
      <label>Region *
        <input name="region" required minLength={2} maxLength={80} placeholder="Ashanti, Greater Accra, etc." />
      </label>
      <label>Neighbourhood
        <input name="neighborhood" maxLength={120} placeholder="Area only, not the street address" />
      </label>
      <label>Construction status
        <select name="construction_status">
          <option value="completed">Completed</option><option value="under_construction">Under construction</option><option value="unknown">Not confirmed</option>
        </select>
      </label>
      <label>{market==="sale"?"Asking price":market==="rent"?"Monthly rent":"Nightly rate"} (GH₵)
        <input name="price_ghs" type="number" min="0.01" max="1000000000" step="0.01" placeholder="Optional for review" />
      </label>
      <label>Bedrooms <input name="bedrooms" type="number" min="0" max="30" step="1" /></label>
      <label>Bathrooms <input name="bathrooms" type="number" min="0" max="30" step="1" /></label>
      {market==="stay" && <label>Maximum guests * <input name="max_guests" required type="number" min="1" max="100" step="1" /></label>}
      <label className="rf-mp-owner-wide">Tell us about the property *
        <textarea name="description" required minLength={20} maxLength={1800} rows={5} placeholder="Describe the layout, condition and what is included. Do not put private contact information in this field." />
      </label>
      <label className="rf-mp-owner-wide">Property photos (optional)
        <input name="photos" type="file" multiple accept="image/jpeg,image/png,image/webp" aria-describedby="property-photo-help" />
        <small id="property-photo-help" className="rf-mp-owner-fine">Up to 3 JPEG, PNG or WebP photos, 3.8 MB total. Use photos you have permission to share. Do not upload ownership documents or ID.</small>
      </label>
      <div hidden aria-hidden="true"><label>Leave blank<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    </fieldset>
    <label className="rf-mp-owner-agreement"><input name="authority" value="yes" type="checkbox" required disabled={busy} />
      I own this property or have explicit authority from the owner to offer it for sale, rent or short stays.
    </label>
    <label className="rf-mp-owner-agreement"><input name="consent" value="yes" type="checkbox" required disabled={busy} />
      I agree that Rexy may use these details to review my property and contact me. I confirm I have permission to share any photos I upload.
    </label>
    {error && <p className="rf-mp-owner-error" role="alert">{error}</p>}
    <button type="submit" disabled={busy} className="rf-button rf-button-dark rf-mp-owner-submit">{busy?"Submitting…":"Submit for private review ↗"}</button>
    <p className="rf-mp-owner-fine">Your contact details and photos stay private during review. Rexy will ask for any proof of ownership or authority separately. Sending this form does not publish a listing.</p>
  </form>;
}

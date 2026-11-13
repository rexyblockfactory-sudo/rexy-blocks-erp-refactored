"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Listing = {
  id: string; market: "sale" | "rent" | "stay"; slug: string; status: "draft" | "published" | "archived";
  title: string; description: string; city: string; region: string; neighborhood: string | null;
  map_url: string | null;
  construction_status: string; price_ghs: number | null; bedrooms: number | null; bathrooms: number | null;
  max_guests: number | null; amenities: string[]; photo_urls: string[];
  verified_at: string | null; verified_by: string | null; verification_notes: string | null;
  published_at: string | null; updated_at: string;
};

type Draft = {
  market: "sale" | "rent" | "stay"; slug: string; title: string; description: string; city: string; region: string;
  neighborhood: string; map_url: string; construction_status: string; price_ghs: string; bedrooms: string; bathrooms: string;
  max_guests: string; amenities: string; photo_urls: string[];
};

const emptyDraft: Draft = {
  market: "sale", slug: "", title: "", description: "", city: "", region: "",
  neighborhood: "", map_url: "", construction_status: "unknown", price_ghs: "", bedrooms: "",
  bathrooms: "", max_guests: "", amenities: "", photo_urls: [],
};

const kumasiPreset: Draft = {
  market: "sale",
  slug: "uncompleted-modern-residence-kumasi",
  title: "Uncompleted Modern Residence — Kumasi",
  description: "Residential building under construction in Kumasi, Ghana. The supplied photographs show a modern multi-level structure, extensive glazed sections and stepped exterior courtyard areas. Construction is unfinished, including portions of the exterior and outdoor facilities. The buyer must inspect the site, verify the land title and approvals, and obtain independent estimates for completion costs. Final layout, room counts, amenities and seller's authority require confirmation; asking price GH₵1,500,000.",
  city: "Kumasi", region: "Ashanti Region", neighborhood: "", map_url: "",
  construction_status: "under_construction", price_ghs: "1500000", bedrooms: "",
  bathrooms: "", max_guests: "", amenities: "", photo_urls: [],
};

function toDraft(x: Listing): Draft {
  return {
    market: x.market, slug: x.slug, title: x.title, description: x.description, city: x.city,
    region: x.region, neighborhood: x.neighborhood ?? "", map_url: x.map_url ?? "", construction_status: x.construction_status ?? "unknown",
    price_ghs: x.price_ghs == null ? "" : String(x.price_ghs),
    bedrooms: x.bedrooms == null ? "" : String(x.bedrooms),
    bathrooms: x.bathrooms == null ? "" : String(x.bathrooms),
    max_guests: x.max_guests == null ? "" : String(x.max_guests),
    amenities: (x.amenities ?? []).join("\n"), photo_urls: x.photo_urls ?? [],
  };
}

function apiBody(d: Draft) {
  return {
    ...d,
    price_ghs: d.price_ghs === "" ? null : Number(d.price_ghs),
    bedrooms: d.bedrooms === "" ? null : Number(d.bedrooms),
    bathrooms: d.bathrooms === "" ? null : Number(d.bathrooms),
    max_guests: d.max_guests === "" ? null : Number(d.max_guests),
    amenities: d.amenities.split("\n").map(x => x.trim()).filter(Boolean),
  };
}

const money = (number: number | null) => number === null ? "Price not supplied"
  : new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(number);

export default function PropertyAdmin({ role }: { role: "admin" | "manager" }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [proof, setProof] = useState({ ownership: false, authority: false, photos: false });
  const [photoConsent, setPhotoConsent] = useState(false);

  const selected = useMemo(() => listings.find(x => x.id === selectedId), [listings, selectedId]);
  const isAdmin = role === "admin";
  const hasUnsavedChanges = Boolean(selected && JSON.stringify(draft) !== JSON.stringify(toDraft(selected)));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/property-listings", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load properties.");
      setListings(data.listings ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load properties.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function setField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft(current => ({ ...current, [key]: value }));
  }

  function beginNew() {
    setSelectedId(""); setDraft(emptyDraft); setError(""); setNotice("");
    setProof({ ownership: false, authority: false, photos: false }); setVerificationNotes("");
  }

  function beginPreset() {
    setSelectedId(""); setDraft(kumasiPreset); setError(""); setNotice("Template loaded. This is not yet saved. Upload your three photographs and complete the verified information before publishing.");
  }

  function select(listing: Listing) {
    setSelectedId(listing.id); setDraft(toDraft(listing)); setError(""); setNotice("");
    setProof({ ownership: false, authority: false, photos: false }); setVerificationNotes("");
  }

  async function send(path: string, method: string, body: unknown) {
    const res = await fetch(path, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not save property.");
    return data;
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (selected && selected.status === "archived") throw new Error("Archived properties are read-only.");
      const body = selected ? { ...apiBody(draft), expected_updated_at: selected.updated_at } : apiBody(draft);
      const response = await send(selected ? "/api/property-listings/" + selected.id : "/api/property-listings", selected ? "PATCH" : "POST", body);
      setNotice("Draft saved. Verification is required before publication.");
      await load();
      if (!selected && response.listing?.id) setSelectedId(response.listing.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save draft."); }
    finally { setBusy(false); }
  }

  async function upload(files: FileList | null) {
    if (!files || files.length === 0 || busy) return;
    if (!photoConsent) { setError("Confirm you have permission to upload and market these photographs."); return; }
    setBusy(true); setError(""); setNotice("");
    const received: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.set("file", file);
        body.set("permission_confirmed", "yes");
        const response = await fetch("/api/property-photos", { method: "POST", body });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Photo upload failed.");
        received.push(data.url);
      }
      setNotice(received.length + " photo(s) uploaded to property storage. Click Save draft to attach them to this property.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to upload photos."); }
    finally {
      if (received.length) setDraft(d => ({ ...d, photo_urls: Array.from(new Set([...d.photo_urls, ...received])).slice(0, 16) }));
      setBusy(false);
    }
  }

  async function doAction(action: "verify" | "publish" | "archive") {
    if (!selected || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const body = action === "verify" ? {
        ownership_checked: proof.ownership, marketing_authority_checked: proof.authority,
        photo_rights_checked: proof.photos, verification_notes: verificationNotes,
      } : action === "archive" ? { archive: true, expected_updated_at: selected.updated_at } : {};
      await send("/api/property-listings/" + selected.id + (action === "archive" ? "" : "/" + action),
        action === "archive" ? "PATCH" : "POST", body);
      setNotice(action === "verify" ? "Verification recorded. Review the listing once more before publishing."
        : action === "publish" ? "Property is now published for public browsing." : "Listing archived and removed from public browsing.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Operation failed."); }
    finally { setBusy(false); }
  }

  return <main className="space-y-6 p-5 md:p-8">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Rexy Real Estate / Rexy Stays</p>
        <h1 className="mt-1 text-3xl font-bold">Property management</h1>
        <p className="mt-2 text-sm text-gray-600">Manage sale, rental and short-stay listings separately from factory products and stock.</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={beginNew} className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-bold text-white">New listing</button>
        <button onClick={beginPreset} className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold">Prepare Kumasi building draft</button>
        <button onClick={() => void load()} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold">Refresh</button>
      </div>
    </div>

    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      Only verified properties are published. Drafts may have missing asking prices, room counts or photographs.
      Publication requires an administrator to confirm evidence of ownership, authority to sell or rent, and photo rights.
      No property deposits, reservations or block-ERP inventory changes are made here.
    </div>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">{notice}</p>}

    <div className="grid gap-6 xl:grid-cols-[minmax(250px,0.7fr)_minmax(0,1.3fr)]">
      <aside className="rounded-xl border bg-white">
        <h2 className="border-b p-4 font-semibold">Property listings ({listings.length})</h2>
        {loading ? <p className="p-4 text-sm text-gray-500">Loading...</p> :
        listings.length === 0 ? <p className="p-4 text-sm text-gray-500">No property listings yet. Create a draft to begin.</p> :
        <div className="max-h-[75vh] overflow-y-auto divide-y">
          {listings.map(item => <button key={item.id} onClick={() => select(item)}
            className={"block w-full p-4 text-left hover:bg-emerald-50 " + (selectedId === item.id ? "bg-emerald-50" : "")}>
            <span className="font-semibold">{item.title}</span>
            <span className="mt-1 block text-xs text-gray-500 capitalize">{item.market === "stay" ? "Short stay" : item.market === "sale" ? "For sale" : "For rent"} · {item.city} · {item.status.replaceAll("_", " ")}</span>
            <span className="mt-1 block text-xs text-gray-600">{money(item.price_ghs)}{item.market === "stay" ? " / night" : item.market === "rent" ? " / month" : ""}</span>
          </button>)}
        </div>}
      </aside>

      <section className="rounded-xl border bg-white p-5 md:p-7">
        <h2 className="text-xl font-bold">{selected ? "Edit property listing" : "Create property draft"}</h2>
        <p className="mb-5 mt-1 text-sm text-gray-500">A draft does not appear on the public website.</p>
        {hasUnsavedChanges && <p role="status" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">Unsaved changes. Save the draft before verifying or publishing this listing.</p>}
        <form onSubmit={save} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">Listing category
              <select className="mt-1 block w-full rounded-lg border p-3" value={draft.market} onChange={e => setField("market", e.target.value as Draft["market"])}>
                <option value="sale">Home for sale</option>
                <option value="rent">Long-term rental</option>
                <option value="stay">Rexy Stays (short stay)</option>
              </select>
            </label>
            <label className="text-sm font-semibold">Construction status
              <select value={draft.construction_status} onChange={e => setField("construction_status", e.target.value)} className="mt-1 block w-full rounded-lg border p-3">
                <option value="unknown">Not confirmed</option>
                <option value="under_construction">Under construction / unfinished</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <label className="text-sm font-semibold sm:col-span-2">Property title
              <input required minLength={4} maxLength={160} className="mt-1 block w-full rounded-lg border p-3" value={draft.title} onChange={e => setField("title", e.target.value)} placeholder="e.g. Uncompleted Modern Residence — Kumasi"/>
            </label>
            <label className="text-sm font-semibold sm:col-span-2">URL slug
              <input required maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" className="mt-1 block w-full rounded-lg border p-3" value={draft.slug} onChange={e => setField("slug", e.target.value)} placeholder="uncompleted-modern-residence-kumasi"/>
            </label>
            <label className="text-sm font-semibold">City / town
              <input required className="mt-1 block w-full rounded-lg border p-3" value={draft.city} onChange={e => setField("city", e.target.value)} />
            </label>
            <label className="text-sm font-semibold">Region
              <input required className="mt-1 block w-full rounded-lg border p-3" value={draft.region} onChange={e => setField("region", e.target.value)} />
            </label>
            <label className="text-sm font-semibold sm:col-span-2">Neighborhood (optional)
              <input className="mt-1 block w-full rounded-lg border p-3" value={draft.neighborhood} onChange={e => setField("neighborhood", e.target.value)} />
            </label>
            <label className="text-sm font-semibold sm:col-span-2">Public Google Maps link (optional)
              <input type="url" maxLength={2048} className="mt-1 block w-full rounded-lg border p-3" value={draft.map_url} onChange={e => setField("map_url", e.target.value)} placeholder="https://www.google.com/maps/…" />
              <span className="mt-1 block text-xs font-normal text-slate-600">Leave blank to show the general area. Only add an exact pin if the owner wants it public.</span>
            </label>
            <label className="text-sm font-semibold">Asking price / monthly rent / nightly rate (GH₵)
              <input type="number" min="0.01" step="0.01" className="mt-1 block w-full rounded-lg border p-3" value={draft.price_ghs} onChange={e => setField("price_ghs", e.target.value)} placeholder="May be empty for a draft" />
            </label>
            <label className="text-sm font-semibold">Bedrooms (if confirmed)
              <input type="number" min="0" max="30" step="1" className="mt-1 block w-full rounded-lg border p-3" value={draft.bedrooms} onChange={e => setField("bedrooms", e.target.value)} />
            </label>
            <label className="text-sm font-semibold">Bathrooms (if confirmed)
              <input type="number" min="0" max="30" step="1" className="mt-1 block w-full rounded-lg border p-3" value={draft.bathrooms} onChange={e => setField("bathrooms", e.target.value)} />
            </label>
            {draft.market === "stay" && <label className="text-sm font-semibold">Maximum guests
              <input type="number" min="1" max="100" step="1" className="mt-1 block w-full rounded-lg border p-3" value={draft.max_guests} onChange={e => setField("max_guests", e.target.value)} />
            </label>}
            <label className="text-sm font-semibold sm:col-span-2">Property description
              <textarea rows={5} maxLength={6000} className="mt-1 block w-full rounded-lg border p-3" value={draft.description} onChange={e => setField("description", e.target.value)} />
            </label>
            <label className="text-sm font-semibold sm:col-span-2">Features / amenities (one per line)
              <textarea rows={3} className="mt-1 block w-full rounded-lg border p-3" value={draft.amenities} onChange={e => setField("amenities", e.target.value)} />
            </label>
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <h3 className="font-bold">Photographs ({draft.photo_urls.length}/16)</h3>
            <p className="text-xs text-gray-500">Upload genuine property photographs only. Do not upload passports, title deeds or documents with personal information.</p>
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={photoConsent} onChange={e => setPhotoConsent(e.target.checked)} /> I have permission to upload and market these photos.</label>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || draft.photo_urls.length >= 16}
              onChange={e => { void upload(e.target.files); e.target.value = ""; }}
              className="block w-full text-xs" />
            {draft.photo_urls.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {draft.photo_urls.map((url, index) => <div key={url} className="rounded-lg border p-2">
                <img src={url} alt={"Property photo " + (index + 1)} className="aspect-video w-full rounded object-cover" />
                <button type="button" onClick={() => setField("photo_urls", draft.photo_urls.filter(item => item !== url))}
                  className="mt-2 text-xs font-semibold text-red-700">Remove from draft</button>
              </div>)}
            </div>}
            <p className="text-xs text-gray-500">Upload files first, then click Save draft to attach their URLs. A failed save does not publish the images as a listing.</p>
          </div>

          <button type="submit" disabled={busy || selected?.status === "archived"}
            className="rounded-lg bg-[#173b2c] px-6 py-3 font-semibold text-white disabled:opacity-50">
            {busy ? "Working..." : selected ? "Save changes as draft" : "Create draft"}
          </button>
        </form>

        {selected && isAdmin && selected.status === "draft" && <div className="mt-7 space-y-4 border-t pt-6">
          <h3 className="text-lg font-bold">Administrator verification</h3>
          <p className="text-sm text-gray-600">Review ownership evidence and the seller's or landlord's signed authority offline. Do not upload these private documents into the public photos bucket.</p>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={proof.ownership} onChange={e => setProof(v => ({ ...v, ownership: e.target.checked }))} /> Ownership or title information independently checked</label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={proof.authority} onChange={e => setProof(v => ({ ...v, authority: e.target.checked }))} /> Authority to sell, rent or host independently checked</label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={proof.photos} onChange={e => setProof(v => ({ ...v, photos: e.target.checked }))} /> Photographer and marketing photo permissions checked</label>
          <label className="block text-sm font-semibold">Verification notes (internal)
            <textarea rows={4} minLength={30} maxLength={3000} className="mt-1 block w-full rounded-lg border p-3" placeholder="Describe which evidence was checked and the date, without storing document numbers or private identity details." value={verificationNotes} onChange={e => setVerificationNotes(e.target.value)} />
          </label>
          <button type="button" disabled={busy || hasUnsavedChanges || !!selected.verified_at} onClick={() => void doAction("verify")} className="rounded-lg bg-amber-600 px-5 py-3 font-semibold text-white disabled:opacity-50">
            {selected.verified_at ? "Verified" : "Verify property"}
          </button>
          <button type="button" disabled={busy || hasUnsavedChanges || !selected.verified_at} onClick={() => void doAction("publish")}
            className="ml-2 rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-white disabled:opacity-50">
            Publish verified listing
          </button>
        </div>}
        {selected && isAdmin && selected.status !== "archived" && <div className="mt-7 border-t pt-5">
          <button type="button" disabled={busy} onClick={() => {
            if (window.confirm("Archive this listing and remove it from public browsing?")) void doAction("archive");
          }} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-800">Archive listing</button>
        </div>}
        <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold">
          <Link className="underline" href="/homes-for-sale">Public homes for sale</Link>
          <Link className="underline" href="/rentals">Public rentals</Link>
          <Link className="underline" href="/rexy-stays">Public Rexy Stays</Link>
        </div>
      </section>
    </div>
  </main>;
}

"use client";

import { useEffect, useState } from "react";
import type { PropertySubmissionData } from "@/lib/property-submission-input";

type Status="pending"|"changes_requested"|"rejected"|"draft_created";
type Submission={
  id:string;reference:string;contact_name:string;contact_phone:string;property_data:PropertySubmissionData;
  photo_count:number;status:Status;review_notes:string|null;listing_id:string|null;updated_at:string;created_at:string;
};
const names:Record<Status,string>={pending:"Pending",changes_requested:"Changes requested",rejected:"Rejected",draft_created:"Draft created"};
const markets={sale:"For sale",rent:"Long-term rental",stay:"Short stay"};
const rate={sale:"asking price",rent:"per month",stay:"per night"};
const money=(n:number)=>new Intl.NumberFormat("en-GH",{style:"currency",currency:"GHS"}).format(n);
const reviewClass="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium disabled:opacity-50";

export default function PropertySubmissionsQueue({role,onOpenDraft}:{role:"admin"|"manager";onOpenDraft:(id:string)=>Promise<void>}) {
  const [status,setStatus]=useState<Status>("pending");
  const [page,setPage]=useState(0);
  const [refresh,setRefresh]=useState(0);
  const [items,setItems]=useState<Submission[]>([]);
  const [more,setMore]=useState(false);
  const [loading,setLoading]=useState(true);
  const [open,setOpen]=useState<string|null>(null);
  const [notes,setNotes]=useState("");
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const item=items.find(x=>x.id===open);

  useEffect(()=>{
    const controller=new AbortController();
    async function load(){
      try {
        const res=await fetch("/api/admin/property-submissions?status="+status+"&offset="+page*20,{cache:"no-store",signal:controller.signal});
        const body=await res.json();
        if (!res.ok) throw new Error(body.error || "Unable to load submissions.");
        if (!controller.signal.aborted){setItems(body.items);setMore(body.has_more);}
      } catch(e) {
        if (!controller.signal.aborted){setItems([]);setMore(false);setError(e instanceof Error?e.message:"Unable to load submissions.");}
      } finally {if (!controller.signal.aborted)setLoading(false);}
    }
    void load();
    return ()=>controller.abort();
  },[status,page,refresh]);

  function changeView(nextStatus:Status,nextPage=0){
    setLoading(true);setItems([]);setOpen(null);setNotes("");setError("");setStatus(nextStatus);setPage(nextPage);setRefresh(x=>x+1);
  }

  async function review(action:"changes_requested"|"rejected"|"create_draft"){
    if (!item || busy) return;
    if (action!=="create_draft" && notes.trim().length<5){setError("Add a short review note first.");return;}
    setBusy(true);setError("");setMessage("");
    try {
      const res=await fetch("/api/admin/property-submissions/"+item.id,{
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action,notes,expected_updated_at:item.updated_at}),
      });
      const body=await res.json();
      if (!res.ok) throw new Error(body.error || "Could not save the review.");
      changeView(status,page);
      if (action==="create_draft"){
        setMessage("Draft created. Review it below, then an administrator can verify and publish it.");
        await onOpenDraft(body.listing_id);
      } else {
        setMessage(action==="rejected"?"Submission rejected. It remains private.":"Changes requested. Use the contact shown to follow up. No message was sent automatically.");
      }
    } catch(e) {setError(e instanceof Error?e.message:"Could not save the review.");}
    finally {setBusy(false);}
  }

  return <section aria-labelledby="property-queue-title" className="space-y-4 rounded-xl border bg-white p-5 md:p-7">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="property-queue-title" className="text-xl font-bold">Pending submissions</h2>
        <p className="mt-1 text-sm text-gray-600">Owner proposals and contact details are visible only to authorised staff.</p></div>
      <button type="button" className={reviewClass} disabled={busy} onClick={()=>changeView(status,page)}>Refresh submissions</button>
    </div>
    <div aria-label="Filter submissions" className="flex flex-wrap gap-2">
      {(Object.keys(names) as Status[]).map(value=><button key={value} type="button" disabled={busy}
        aria-pressed={status===value} onClick={()=>{setMessage("");changeView(value);}}
        className={reviewClass+(status===value?" bg-emerald-800 text-white":" bg-white")}>{names[value]}</button>)}
    </div>
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
    {loading ? <p role="status" className="text-sm text-gray-600">Loading submissions…</p> :
      items.length===0 ? <p className="text-sm text-gray-600">No submissions in this category.</p> :
      <ul className="divide-y rounded-lg border">
        {items.map(entry=><li key={entry.id}>
          <button type="button" aria-expanded={open===entry.id} disabled={busy}
            onClick={()=>{setOpen(open===entry.id?null:entry.id);setNotes(entry.review_notes??"");setError("");}}
            className="w-full p-4 text-left hover:bg-emerald-50">
            <span className="block font-semibold">{entry.property_data.title}</span>
            <span className="block text-sm text-gray-600">{markets[entry.property_data.market]} · {entry.property_data.city}</span>
            <span className="block break-all text-xs text-gray-500">{entry.reference} · {new Date(entry.created_at).toLocaleDateString("en-GH",{timeZone:"Africa/Accra"})}</span>
          </button>
          {open===entry.id && <div className="space-y-3 border-t bg-gray-50 p-4 text-sm">
            <p><strong>Private contact</strong> {entry.contact_name} · {entry.contact_phone}</p>
            <p><strong>Property</strong> {entry.property_data.region}{entry.property_data.neighborhood?" · "+entry.property_data.neighborhood:""} · {entry.property_data.construction_status.replaceAll("_"," ")}</p>
            <p>{entry.property_data.price_ghs===null?"Price not provided":money(entry.property_data.price_ghs)+" "+rate[entry.property_data.market]} · Beds {entry.property_data.bedrooms??"—"} · Baths {entry.property_data.bathrooms??"—"}{entry.property_data.max_guests? " · Guests "+entry.property_data.max_guests:""}</p>
            <p className="whitespace-pre-wrap break-words">{entry.property_data.description}</p>
            {entry.photo_count>0 && <div className="grid gap-2 sm:grid-cols-3">
              {Array.from({length:entry.photo_count},(_,index)=><a key={index} href={"/api/admin/property-submissions/"+entry.id+"/photos/"+index} target="_blank" rel="noreferrer"
                className="rounded border bg-white px-3 py-2 font-medium underline">Open private photo {index+1} ↗</a>)}
            </div>}
            {entry.status==="pending" || entry.status==="changes_requested" ? <>
              <label className="block font-medium">Private review note
                <textarea rows={2} maxLength={1500} value={notes} disabled={busy} onChange={e=>setNotes(e.target.value)} className="mt-1 block w-full rounded border bg-white p-2 font-normal" />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={()=>void review("create_draft")} className={reviewClass+" bg-emerald-800 text-white"}>Create listing draft</button>
                <button type="button" disabled={busy} onClick={()=>void review("changes_requested")} className={reviewClass}>Mark changes requested</button>
                {role==="admin" && <button type="button" disabled={busy} onClick={()=>void review("rejected")} className={reviewClass+" text-red-800"}>Reject</button>}
              </div>
            </>:<>
              {entry.review_notes && <p className="whitespace-pre-wrap"><strong>Private review note</strong> {entry.review_notes}</p>}
              {entry.listing_id && <button type="button" className={reviewClass} onClick={()=>void onOpenDraft(entry.listing_id!)}>Open listing</button>}
            </>}
          </div>}
        </li>)}
      </ul>}
    {(page>0 || more) && <div className="flex gap-2">
      <button type="button" disabled={page===0||busy||loading} className={reviewClass} onClick={()=>changeView(status,page-1)}>Previous</button>
      <button type="button" disabled={!more||busy||loading} className={reviewClass} onClick={()=>changeView(status,page+1)}>Next</button>
    </div>}
  </section>;
}

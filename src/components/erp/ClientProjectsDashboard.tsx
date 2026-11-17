"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type Project = {
  id: string; name: string; location: string; description: string;
  status: "planning" | "in_progress" | "on_hold" | "completed";
  progress_percent: number; start_date: string | null; target_date: string | null; updated_at: string;
};
type Milestone = { id:string; title:string; status:"pending"|"in_progress"|"completed"; due_date:string|null; sort_order:number };
type Update = { id:string; heading:string; details:string; progress_percent:number; created_at:string; is_visible:boolean };
type Photo = { id:string; caption:string; url:string; created_at:string };
type ProjectDetail = { project:Project; milestones:Milestone[]; updates:Update[]; photos:Photo[]; members:{user_id:string;added_at:string;email:string|null;full_name:string|null}[] };

const statuses=[{value:"planning",label:"Planning"},{value:"in_progress",label:"In progress"},{value:"on_hold",label:"On hold"},{value:"completed",label:"Completed"}] as const;
const milestoneStates=[{value:"pending",label:"Pending"},{value:"in_progress",label:"In progress"},{value:"completed",label:"Completed"}] as const;
const blankProject={name:"",location:"",description:"",status:"planning",progress_percent:0,start_date:"",target_date:""};
type EditorProject = typeof blankProject;

function formatProject(p:Project):EditorProject{
  return {name:p.name,location:p.location,description:p.description,status:p.status,
    progress_percent:p.progress_percent,start_date:p.start_date??"",target_date:p.target_date??""};
}
const inputClass="mt-1 block w-full rounded-lg border border-[#cad8cc] bg-white px-3 py-2.5 text-sm text-[#183929]";
const buttonClass="rounded-lg bg-[#173f2c] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50";

export default function ClientProjectsDashboard({ role }:{role:"admin"|"manager"}) {
  const [projects,setProjects]=useState<Project[]>([]);
  const [selected,setSelected]=useState<string>("");
  const [projectData,setProjectData]=useState<ProjectDetail|null>(null);
  const [editor,setEditor]=useState<EditorProject>(blankProject);
  const [creating,setCreating]=useState(false);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [ownerEmail,setOwnerEmail]=useState("");
  const [heading,setHeading]=useState("");
  const [details,setDetails]=useState("");
  const [reportedPercent,setReportedPercent]=useState(0);
  const [milestoneTitle,setMilestoneTitle]=useState("");
  const [milestoneDue,setMilestoneDue]=useState("");
  const [milestoneState,setMilestoneState]=useState("pending");
  const [caption,setCaption]=useState("");
  const [permission,setPermission]=useState(false);

  const loadProjects=useCallback(async()=>{
    try{
      const response=await fetch("/api/client-projects",{cache:"no-store"});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||"Projects could not be loaded.");
      setProjects(data.projects??[]);
    }catch(e){setError(e instanceof Error?e.message:"Project list unavailable")}
    finally{setLoading(false)}
  },[]);
  const loadDetail=useCallback(async(id:string)=>{
    try{
      const res=await fetch("/api/client-projects/"+id,{cache:"no-store"});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Project details are unavailable.");
      setProjectData(data);
      setEditor(formatProject(data.project));
      setReportedPercent(data.project.progress_percent);
    }catch(e){setError(e instanceof Error?e.message:"Unable to load project.");}
  },[]);
  useEffect(()=>{void loadProjects()},[loadProjects]);
  useEffect(()=>{if(selected&&!creating)void loadDetail(selected)},[selected,creating,loadDetail]);

  async function send(url:string,body:unknown,method="POST"){
    const response=await fetch(url,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const data=await response.json();
    if(!response.ok) throw new Error(data.error||"The request failed.");
    return data;
  }
  function beginCreate(){
    setCreating(true);setSelected("");setProjectData(null);setEditor(blankProject);
    setError("");setNotice("");
  }
  function choose(id:string){setCreating(false);setSelected(id);setError("");setNotice("");}
  async function saveProject(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return;
    setBusy(true);setError("");setNotice("");
    try{
      const body={...editor,status:editor.status,progress_percent:Number(editor.progress_percent),
        start_date:editor.start_date||null,target_date:editor.target_date||null};
      const data=await send(creating?"/api/client-projects":"/api/client-projects/"+selected,body,creating?"POST":"PATCH");
      setNotice(creating?"Project created. Assign the owner to give access.":"Project details saved.");
      await loadProjects();
      if(creating && data.project?.id){setCreating(false);setSelected(data.project.id);}
      else if(selected)await loadDetail(selected);
    }catch(e){setError(e instanceof Error?e.message:"Unable to save project.")}
    finally{setBusy(false)}
  }

  async function addUpdate(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy||!selected)return;
    setBusy(true);setError("");setNotice("");
    try{
      await send("/api/client-projects/"+selected+"/updates",{heading,details,progress_percent:Number(reportedPercent)});
      setHeading("");setDetails("");setNotice("Progress report saved and immediately visible to linked project owners.");
      await loadDetail(selected);await loadProjects();
    }catch(e){setError(e instanceof Error?e.message:"Unable to save progress report.")}
    finally{setBusy(false)}
  }
  async function addMilestone(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy||!selected)return;
    setBusy(true);setError("");setNotice("");
    try{
      await send("/api/client-projects/"+selected+"/milestones",{
        title:milestoneTitle,status:milestoneState,due_date:milestoneDue||null,sort_order:projectData?.milestones.length??0});
      setMilestoneTitle("");setMilestoneDue("");setMilestoneState("pending");
      setNotice("Construction milestone added.");await loadDetail(selected);
    }catch(e){setError(e instanceof Error?e.message:"Unable to add milestone.")}
    finally{setBusy(false)}
  }
  async function changeMilestone(m:Milestone,status:string){
    if(busy||!selected)return;setBusy(true);setError("");setNotice("");
    try{
      await send("/api/client-projects/"+selected+"/milestones",{
        milestone_id:m.id,title:m.title,due_date:m.due_date,sort_order:m.sort_order,status},"PATCH");
      setNotice("Milestone status updated.");await loadDetail(selected);
    }catch(e){setError(e instanceof Error?e.message:"Unable to update milestone.")}
    finally{setBusy(false)}
  }
  async function invite(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!selected||busy)return;
    setBusy(true);setError("");setNotice("");
    try{
      const data=await send("/api/client-projects/"+selected+"/invite",{email:ownerEmail});
      setOwnerEmail("");setNotice(data.message||"Project owner linked.");
      await loadDetail(selected);
    }catch(e){setError(e instanceof Error?e.message:"Unable to invite owner.")}
    finally{setBusy(false)}
  }
  async function revokeOwner(userId:string){
    if(!selected||busy||!window.confirm("Remove this owner's access to this project's updates?"))return;
    setBusy(true);setError("");setNotice("");
    try{
      const response=await fetch("/api/client-projects/"+selected+"/members/"+userId,{method:"DELETE"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Unable to remove client access.");
      setNotice("Access removed from this project.");await loadDetail(selected);
    }catch(e){setError(e instanceof Error?e.message:"Unable to revoke access.")}
    finally{setBusy(false)}
  }
  async function setUpdateVisibility(updateId:string,is_visible:boolean){
    if(!selected||busy)return;
    setBusy(true);setError("");setNotice("");
    try{
      await send("/api/client-projects/"+selected+"/updates/"+updateId,{is_visible},"PATCH");
      setNotice(is_visible?"Report is visible to owners again.":"Report hidden from project owners.");await loadDetail(selected);
    }catch(e){setError(e instanceof Error?e.message:"Unable to change report visibility.")}
    finally{setBusy(false)}
  }
  async function removePhoto(photoId:string){
    if(!selected||busy||!window.confirm("Remove this private photo from the project?"))return;
    setBusy(true);setError("");setNotice("");
    try{
      const response=await fetch("/api/client-projects/"+selected+"/photos/"+photoId,{method:"DELETE"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Photo deletion failed.");
      setNotice("Photo removed from the private project gallery.");await loadDetail(selected);
    }catch(e){setError(e instanceof Error?e.message:"Unable to remove photo.")}
    finally{setBusy(false)}
  }
  async function upload(files:FileList|null){
    if(!selected||busy||!files?.length)return;
    if(!permission){setError("Confirm these images are approved for private sharing with the owner.");return;}
    setBusy(true);setError("");setNotice("");
    let completed=0;
    try{
      for(const file of Array.from(files)){
        const form=new FormData();form.set("photo",file);form.set("caption",caption);
        form.set("confirmed","yes");
        const response=await fetch("/api/client-projects/"+selected+"/photos",{method:"POST",body:form});
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||"Photo upload failed.");
        completed++;
      }
      setCaption("");setPermission(false);setNotice(completed+" photo(s) privately uploaded.");
      await loadDetail(selected);
    }catch(e){setError(e instanceof Error?e.message:"Unable to upload photographs.")}
    finally{setBusy(false)}
  }

  return <main className="space-y-7 p-5 text-[#193c2b] md:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#9a7740]">Rexy Client Projects</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Project progress manager</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[#607468]">Report construction progress, manage milestones, upload private site photos and link the right owner to each project.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={beginCreate} className={buttonClass}>New construction project</button>
        <Link href="/project-login" target="_blank" className="rounded-lg border border-[#bdcebf] bg-white px-4 py-2.5 text-sm font-semibold">Owner login ↗</Link>
      </div>
    </header>
    <div className="rounded-xl border border-[#d4dfce] bg-[#eef3e7] p-4 text-xs leading-6 text-[#526958]">
      Progress figures and notes are staff-reported. Photos remain in private storage and are shown only to assigned clients. This does not change stock, block sales, invoices or financial records.
    </div>
    {error&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {notice&&<p role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
    <div className="grid items-start gap-7 xl:grid-cols-[minmax(240px,.65fr)_minmax(0,1.35fr)]">
      <aside className="rounded-xl border bg-white">
        <h2 className="border-b p-4 font-semibold">Projects ({projects.length})</h2>
        {loading?<p className="p-4 text-sm text-[#66776b]">Loading…</p>:
          projects.length===0?<p className="p-5 text-sm leading-7 text-[#66776b]">No real construction projects have been created yet. Add one using the button above.</p>:
          <div className="max-h-[70vh] divide-y overflow-auto">{projects.map(p=>
            <button key={p.id} type="button" onClick={()=>choose(p.id)}
              className={"w-full p-4 text-left hover:bg-[#edf5eb] "+(selected===p.id?"bg-[#eaf4e8]":"")}>
              <span className="block font-semibold">{p.name}</span>
              <span className="mt-1 block text-xs text-[#66786c]">{p.location} · {p.status.replaceAll("_"," ")}</span>
              <span className="mt-2 block text-xs font-semibold">{p.progress_percent}% complete</span>
              <span className="mt-2 block h-1.5 rounded-full bg-[#e1e9dd]"><span className="block h-full rounded-full bg-[#397752]" style={{width:p.progress_percent+"%"}}/></span>
            </button>)}</div>}
      </aside>
      <div className="space-y-6">
        {!creating&&!selected?<section className="rounded-xl border bg-white p-7"><h2 className="text-xl font-semibold">Select a project or create one</h2><p className="mt-3 text-sm leading-7 text-[#64796a]">Every project starts private. Project owners see it only after an administrator links their email to the project.</p></section>:null}
        {(creating||selected)&&<section className="rounded-xl border bg-white p-6 sm:p-7">
          <h2 className="text-xl font-bold">{creating?"Create a project":"Edit project overview"}</h2>
          <form onSubmit={saveProject} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold sm:col-span-2">Project name
              <input required minLength={4} maxLength={160} value={editor.name} onChange={e=>setEditor(v=>({...v,name:e.target.value}))} className={inputClass} placeholder="e.g. Client's residential construction"/>
            </label>
            <label className="text-sm font-semibold sm:col-span-2">Site location
              <input required minLength={2} maxLength={160} value={editor.location} onChange={e=>setEditor(v=>({...v,location:e.target.value}))} className={inputClass} placeholder="City, neighborhood"/>
            </label>
            <label className="text-sm font-semibold">Project stage
              <select value={editor.status} onChange={e=>setEditor(v=>({...v,status:e.target.value}))} className={inputClass}>
                {statuses.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">Progress reported (%)
              <input required type="number" min="0" max="100" step="1" value={editor.progress_percent} onChange={e=>setEditor(v=>({...v,progress_percent:Number(e.target.value)}))} className={inputClass}/>
            </label>
            <label className="text-sm font-semibold">Start date (optional)
              <input type="date" value={editor.start_date} onChange={e=>setEditor(v=>({...v,start_date:e.target.value}))} className={inputClass}/>
            </label>
            <label className="text-sm font-semibold">Target date (optional)
              <input type="date" value={editor.target_date} onChange={e=>setEditor(v=>({...v,target_date:e.target.value}))} className={inputClass}/>
            </label>
            <label className="text-sm font-semibold sm:col-span-2">Project overview (visible to owner)
              <textarea rows={4} maxLength={5000} value={editor.description} onChange={e=>setEditor(v=>({...v,description:e.target.value}))} className={inputClass} placeholder="Scope of construction, current phase and general notes"/>
            </label>
            <div className="sm:col-span-2"><button disabled={busy} type="submit" className={buttonClass}>{busy?"Saving...":creating?"Create project":"Save project overview"}</button></div>
          </form>
        </section>}
        {selected&&projectData&&<>
          {role==="admin"&&<section className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-bold">Invite the project owner</h2>
            <p className="mt-2 text-xs leading-6 text-[#667d6a]">Use the owner's correct email. New clients receive an email invitation; existing clients are linked directly. An owner can see only projects assigned to their account.</p>
            <form onSubmit={invite} className="mt-4 flex flex-wrap gap-3">
              <input required type="email" value={ownerEmail} onChange={e=>setOwnerEmail(e.target.value)} placeholder="owner@example.com" className={inputClass+" min-w-0 flex-1"}/>
              <button type="submit" disabled={busy} className={buttonClass}>Invite / link owner</button>
            </form>
            <p className="mt-3 text-xs text-[#738776]">Authorised client accounts linked: {projectData.members.length}</p>
            {projectData.members.length>0&&<div className="mt-3 space-y-2 border-t pt-3">{projectData.members.map(m=><div key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#eff4ed] p-3">
              <span className="text-xs text-[#48634f]">{m.email||m.full_name||"Account: "+m.user_id.slice(0,8)+"…"} · Linked {new Date(m.added_at).toLocaleDateString("en-GH")}</span>
              <button type="button" disabled={busy} onClick={()=>void revokeOwner(m.user_id)} className="text-xs font-bold text-red-800 underline underline-offset-2">Revoke access</button>
            </div>)}</div>}
          </section>}
          <section className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-bold">Post a progress report</h2>
            <p className="mt-2 text-xs text-[#687d6b]">New reports appear on all assigned owners' portals.</p>
            <form onSubmit={addUpdate} className="mt-4 space-y-4">
              <label className="block text-sm font-semibold">Update heading
                <input required minLength={4} maxLength={160} value={heading} onChange={e=>setHeading(e.target.value)} className={inputClass} placeholder="e.g. Ground floor columns completed"/>
              </label>
              <label className="block text-sm font-semibold">Work completed / next steps
                <textarea required minLength={10} maxLength={5000} rows={4} value={details} onChange={e=>setDetails(e.target.value)} className={inputClass}/>
              </label>
              <label className="block text-sm font-semibold">Current completion percentage
                <input type="number" min="0" max="100" step="1" required value={reportedPercent} onChange={e=>setReportedPercent(Number(e.target.value))} className={inputClass}/>
              </label>
              <button disabled={busy} className={buttonClass}>{busy?"Saving...":"Publish progress update"}</button>
            </form>
            {projectData.updates.length>0&&<div className="mt-6 space-y-3 border-t pt-5">{projectData.updates.map(u=><div key={u.id} className="border-l-2 border-[#c8a15b] pl-4"><p className="text-xs text-[#718274]">{new Date(u.created_at).toLocaleDateString("en-GH")} · {u.progress_percent}%</p><h3 className="mt-1 font-semibold">{u.heading}</h3><p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#637769]">{u.details}</p>
            {role==="admin"&&<button type="button" disabled={busy} className="mt-2 text-xs font-semibold text-[#7f6a43] underline underline-offset-2" onClick={()=>void setUpdateVisibility(u.id,!u.is_visible)}>{u.is_visible?"Hide from owner":"Restore owner visibility"}</button>}
            {!u.is_visible&&<span className="ml-2 text-xs text-[#8f683a]">Hidden</span>}</div>)}</div>}
          </section>
          <section className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-bold">Construction milestones</h2>
            <form onSubmit={addMilestone} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold sm:col-span-2">Milestone title
                <input required minLength={3} maxLength={160} value={milestoneTitle} onChange={e=>setMilestoneTitle(e.target.value)} placeholder="e.g. Roofing completed" className={inputClass}/>
              </label>
              <label className="text-sm font-semibold">Stage
                <select value={milestoneState} onChange={e=>setMilestoneState(e.target.value)} className={inputClass}>
                  {milestoneStates.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold">Expected date
                <input type="date" value={milestoneDue} onChange={e=>setMilestoneDue(e.target.value)} className={inputClass}/>
              </label>
              <div className="sm:col-span-2"><button disabled={busy} className={buttonClass}>Add milestone</button></div>
            </form>
            {projectData.milestones.length>0&&<div className="mt-6 space-y-3 border-t pt-5">{projectData.milestones.map(m=><div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div><p className="font-semibold">{m.title}</p><p className="mt-1 text-xs text-[#66776b]">{m.due_date||"No due date"}</p></div>
              <select aria-label={"Status for "+m.title} disabled={busy} value={m.status} onChange={e=>void changeMilestone(m,e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm">{milestoneStates.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select>
            </div>)}</div>}
          </section>
          <section className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-bold">Private site photographs</h2>
            <p className="mt-2 text-xs leading-6 text-[#687d6b]">Only authorised project owners will receive short-lived access to these images. Do not upload identity documents, payment details or unrelated site photographs.</p>
            <label className="mt-4 block text-sm font-semibold">Photo caption
              <input maxLength={240} value={caption} onChange={e=>setCaption(e.target.value)} className={inputClass} placeholder="Work shown, construction stage or date"/>
            </label>
            <label className="mt-3 flex gap-2 text-xs leading-6"><input type="checkbox" checked={permission} onChange={e=>setPermission(e.target.checked)}/>I confirm these photos may be shared with this project's owners.</label>
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy} className="mt-3 block w-full text-sm" onChange={e=>{void upload(e.target.files);e.target.value="";}}/>
            <p className="mt-2 text-xs text-[#778678]">JPEG, PNG or WebP. Maximum 4 MB per photo.</p>
            {projectData.photos.length>0&&<div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{projectData.photos.map(photo=><figure key={photo.id} className="overflow-hidden rounded border">
              <img src={photo.url} alt={photo.caption||"Site photo"} className="aspect-[4/3] w-full object-cover"/>
              <figcaption className="p-2 text-xs text-[#5e7667]">{photo.caption||"Construction progress"}</figcaption>{role==="admin"&&<button type="button" disabled={busy} onClick={()=>void removePhoto(photo.id)} className="px-2 pb-3 text-xs font-semibold text-red-800 underline underline-offset-2">Remove photo</button>}
            </figure>)}</div>}
          </section>
        </>}
      </div>
    </div>
  </main>;
}

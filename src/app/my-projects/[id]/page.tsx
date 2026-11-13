import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSignedInProjectOwnerId, loadOwnerProject, projectStatusLabel } from "@/lib/client-projects";
import { Brand } from "@/components/public-site/PublicSiteShell";
import ClientPortalSignOut from "@/components/public-site/ClientPortalSignOut";

export const dynamic = "force-dynamic";
export const metadata = { title: "Project Progress | Rexy", robots: { index: false, follow: false } };
type Context = { params: Promise<{ id: string }> };
const date=(value:string|null)=>value?new Date(value+"T00:00:00Z").toLocaleDateString("en-GH",{year:"numeric",month:"short",day:"numeric"}):"Not set";

export default async function OwnerProjectPage({params}:Context) {
  const userId=await getSignedInProjectOwnerId();
  if(!userId) redirect("/project-login");
  const {id}=await params;
  const detail=await loadOwnerProject(userId,id);
  if(!detail) notFound();
  const {project,milestones,updates,photos}=detail;
  return <main className="min-h-screen bg-[#eff3ec] text-[#183829]">
    <header className="border-b border-[#d3dfd3] bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5"><Brand/><ClientPortalSignOut/></div></header>
    <div className="mx-auto max-w-6xl px-5 pb-20 pt-10">
      <nav className="text-xs font-semibold text-[#45694e]"><Link href="/my-projects" className="underline underline-offset-4">← All my projects</Link></nav>
      <p className="mt-9 text-xs font-bold uppercase tracking-[.18em] text-[#a27d42]">PRIVATE PROJECT REPORT</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{project.name}</h1>
      <p className="mt-3 text-sm text-[#63776a]">{project.location}</p>
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-[#173f2c] p-6 text-white sm:col-span-2">
          <p className="text-xs uppercase tracking-wider text-[#d5e5d6]">Reported overall progress</p>
          <p className="mt-4 text-5xl font-semibold">{project.progress_percent}%</p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-[#ebbe6c]" style={{width:project.progress_percent+"%"}} /></div>
          <p className="mt-4 text-xs text-[#d4e3d8]">Status: {projectStatusLabel[project.status]}. Updated {new Date(project.updated_at).toLocaleDateString("en-GH")}.</p>
        </div>
        <div className="rounded-xl border bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#778a78]">Project timeline</p>
          <p className="mt-4 text-sm"><strong>Started:</strong> {date(project.start_date)}</p>
          <p className="mt-3 text-sm"><strong>Target:</strong> {date(project.target_date)}</p>
          <p className="mt-4 text-xs leading-6 text-[#718171]">Target dates are estimates unless confirmed in your contract.</p>
        </div>
      </div>
      {project.description && <section className="mt-10 rounded-xl border bg-white p-7"><h2 className="text-xl font-semibold">About the project</h2><p className="mt-3 whitespace-pre-line text-sm leading-8 text-[#526b59]">{project.description}</p></section>}
      <div className="mt-9 grid gap-7 lg:grid-cols-2">
        <section className="rounded-xl border bg-white p-6 sm:p-7">
          <h2 className="text-2xl font-semibold">Construction milestones</h2>
          <p className="mt-2 text-xs leading-6 text-[#768777]">Milestones reflect the most recent staff updates.</p>
          {!milestones.length?<p className="mt-6 text-sm text-[#748376]">Milestones have not been added yet.</p>:
          <ol className="mt-6 space-y-4">{milestones.map(item=><li key={item.id} className="flex gap-3 rounded-lg border border-[#e1e9df] p-4">
            <span className={"mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold "+(item.status==="completed"?"bg-[#dcefe2] text-[#1f6442]":"bg-[#f2ecd9] text-[#8a6c2f]")}>{item.status==="completed"?"✓":"·"}</span>
            <div><h3 className="text-sm font-semibold">{item.title}</h3><p className="mt-1 text-xs capitalize text-[#708273]">{item.status.replaceAll("_"," ")}{item.due_date ? " · Due "+date(item.due_date):""}</p></div>
          </li>)}</ol>}
        </section>
        <section className="rounded-xl border bg-white p-6 sm:p-7">
          <h2 className="text-2xl font-semibold">Progress updates</h2>
          {!updates.length?<p className="mt-6 text-sm text-[#748376]">Your coordinator has not shared a progress report yet.</p>:
          <div className="mt-6 space-y-6">{updates.map(update=><article key={update.id} className="border-l-2 border-[#c8a76a] pl-5">
            <p className="text-xs font-semibold text-[#728676]">{new Date(update.created_at).toLocaleDateString("en-GH")} · {update.progress_percent}%</p>
            <h3 className="mt-1 font-semibold">{update.heading}</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#5c7060]">{update.details}</p>
          </article>)}</div>}
        </section>
      </div>
      <section className="mt-9 rounded-xl border bg-white p-6 sm:p-7">
        <h2 className="text-2xl font-semibold">Site photo gallery</h2>
        <p className="mt-2 text-xs text-[#728676]">Private site photographs shared by Rexy staff.</p>
        {!photos.length?<p className="mt-6 text-sm text-[#748376]">No progress photographs have been shared yet.</p>:
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{photos.map(photo=><figure key={photo.id} className="overflow-hidden rounded-lg border bg-[#e7eee6]">
          <img src={photo.url} alt={photo.caption||"Construction site progress"} className="aspect-[4/3] w-full object-cover" loading="lazy"/>
          <figcaption className="bg-white p-3 text-xs leading-6 text-[#5c7361]">{photo.caption||"Construction site progress"} · {new Date(photo.created_at).toLocaleDateString("en-GH")}</figcaption>
        </figure>)}</div>}
      </section>
      <div className="mt-9 flex flex-wrap items-center gap-4"><a href="https://wa.me/233547831902?text=Hello%20Rexy%20Blocks%20Factory%2C%20I%20have%20a%20question%20about%20my%20construction%20project." target="_blank" rel="noopener noreferrer" className="rounded-lg bg-[#173f2c] px-5 py-3 text-sm font-semibold text-white">Contact project coordinator ↗</a><Link href="/my-projects" className="text-sm font-semibold underline underline-offset-4">Back to projects</Link></div>
      <p className="mt-8 text-xs leading-6 text-[#728575]">Progress is reported by Rexy staff; it is not independently certified construction completion, a payment statement, or a substitute for contractual inspection reports.</p>
    </div>
  </main>;
}

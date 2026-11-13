import Link from "next/link";
import { redirect } from "next/navigation";
import { getSignedInProjectOwnerId, loadOwnerProjects, projectStatusLabel } from "@/lib/client-projects";
import { Brand } from "@/components/public-site/PublicSiteShell";
import ClientPortalSignOut from "@/components/public-site/ClientPortalSignOut";

export const metadata = { title: "My Construction Projects | Rexy", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function MyProjectsPage() {
  const userId=await getSignedInProjectOwnerId();
  if(!userId) redirect("/project-login");
  let projects:Awaited<ReturnType<typeof loadOwnerProjects>>=[];
  let problem=false;
  try{projects=await loadOwnerProjects(userId)}catch{problem=true}
  return <main className="min-h-screen bg-[#edf2ea] text-[#183a2a]">
    <header className="border-b border-[#d3e0d3] bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-5 py-5">
        <Brand/><ClientPortalSignOut/>
      </div>
    </header>
    <div className="mx-auto max-w-6xl px-5 py-11 md:py-16">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[#967142]">REXY PROJECT TRACKER</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Your construction projects</h1>
      <p className="mt-3 max-w-xl text-sm leading-7 text-[#617465]">See the latest progress reported by Rexy staff, milestone status, and authorised site photographs.</p>
      {problem ? <section role="alert" className="mt-9 rounded-lg border border-amber-300 bg-amber-50 p-6 text-sm">Your projects are temporarily unavailable. Please try again later.</section>
        : projects.length===0 ? <section className="mt-9 rounded-2xl border border-[#cbd7c9] bg-white p-9">
          <h2 className="text-xl font-semibold">No project has been linked to your account yet.</h2>
          <p className="mt-3 text-sm leading-7 text-[#617465]">Ask your Rexy project coordinator to add your account to the correct construction project. You cannot join another owner's project yourself.</p>
          <a href="https://wa.me/233547831902?text=Hello%20Rexy%20Blocks%20Factory%2C%20please%20help%20me%20connect%20my%20project%20to%20my%20client%20portal." className="mt-5 inline-block rounded-lg bg-[#183e2d] px-5 py-3 text-sm font-semibold text-white">Contact Rexy ↗</a>
        </section> :
        <div className="mt-9 grid gap-5 md:grid-cols-2">
          {projects.map(project=><Link href={"/my-projects/"+project.id} key={project.id} className="rounded-2xl border border-[#d2ddd0] bg-white p-7 shadow-sm transition hover:shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#a07b42]">{projectStatusLabel[project.status]}</span>
              <span className="text-sm font-semibold">{project.progress_percent}%</span>
            </div>
            <h2 className="mt-3 text-2xl font-semibold">{project.name}</h2>
            <p className="mt-1 text-sm text-[#607467]">{project.location}</p>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-[#dfe9dc]">
              <div className="h-full rounded-full bg-[#286b4e]" style={{width:project.progress_percent+"%"}}/>
            </div>
            <p className="mt-5 text-xs text-[#687d6f]">Last updated {new Date(project.updated_at).toLocaleDateString("en-GH")}</p>
            <span className="mt-4 inline-block text-sm font-bold underline underline-offset-4">View project details ↗</span>
          </Link>)}
        </div>}
      <p className="mt-10 text-xs leading-6 text-[#7b8d7f]">Project percentages reflect staff progress reports and are informational, not independent certification of completed work or payment entitlement.</p>
    </div>
  </main>;
}

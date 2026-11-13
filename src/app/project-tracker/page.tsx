import Link from "next/link";
import PublicSiteShell from "@/components/public-site/PublicSiteShell";
import { publicMetadata } from "@/components/public-site/site-metadata";

export const metadata=publicMetadata("Track Your Construction Project | Rexy",
  "Rexy construction clients can securely see staff-reported project progress, milestones and private site photographs.","/project-tracker");

const features=[
  {num:"01",heading:"Progress at a glance",text:"View the latest construction stage and completion percentage reported by your Rexy project coordinator."},
  {num:"02",heading:"Construction milestones",text:"Follow the planned work stages and see which milestones are pending, underway or marked complete."},
  {num:"03",heading:"Private site photographs",text:"Browse site progress images shared with your project account, rather than a public gallery."},
];

export default function ProjectTrackerPage(){
  return <PublicSiteShell><main className="bg-[#f6f7f0] text-[#1b392b]">
    <section className="border-b border-[#d3dfd3] bg-[#e9eee4] py-20 md:py-28">
      <div className="rf-container">
        <p className="rf-eyebrow">REXY PROJECT OWNER PORTAL</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-[1.1] tracking-[-.055em] md:text-7xl">Follow your build.<br/><em className="font-serif font-normal text-[#967449]">Wherever you are.</em></h1>
        <p className="mt-8 max-w-xl text-sm leading-8 text-[#536d5c]">If Rexy is managing your construction project, your private owner portal makes it easier to check staff-reported progress, project timelines and site photographs — whether you are in Kumasi or abroad.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/project-login" className="rf-button rf-button-dark">Log in to my project ↗</Link>
          <a href="https://wa.me/233547831902?text=Hello%20Rexy%2C%20I%20would%20like%20to%20learn%20about%20the%20project%20owner%20portal." className="rf-button rf-button-outline" target="_blank" rel="noopener noreferrer">Ask about project tracking ↗</a>
        </div>
        <p className="mt-6 text-xs text-[#7a8c7c]">Access is invitation-only. Rexy staff must link your account to your specific project.</p>
      </div>
    </section>
    <section className="rf-container py-20">
      <p className="rf-eyebrow">WHAT YOU CAN SEE</p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">Project visibility, made simple.</h2>
      <div className="mt-10 grid gap-5 md:grid-cols-3">{features.map(item=>
        <article key={item.num} className="rounded-lg border border-[#d5dfd2] bg-white p-7">
          <p className="text-xs font-bold tracking-[.2em] text-[#a68248]">{item.num}</p>
          <h3 className="mt-6 text-xl font-semibold">{item.heading}</h3>
          <p className="mt-3 text-sm leading-8 text-[#617465]">{item.text}</p>
        </article>)}</div>
      <p className="mt-8 text-xs leading-7 text-[#708476]">The portal is informational. Progress figures are reported by project staff and do not replace independent inspections, signed certifications or contractual payment records.</p>
    </section>
  </main></PublicSiteShell>;
}

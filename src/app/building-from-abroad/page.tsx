import Link from "next/link";
import Image from "next/image";
import PublicSiteShell, { WHATSAPP_URL } from "@/components/public-site/PublicSiteShell";
import { HERO_IMAGE, publicMetadata } from "@/components/public-site/site-metadata";

export const metadata = publicMetadata("Building in Ghana from Abroad", "Plan your concrete block supply in Ghana from overseas. Request a written quotation and coordinate local delivery or pickup with Rexy Blocks Factory in Kumasi.", "/building-from-abroad");

const steps = [
  { title: "Tell us about your site", text: "Share the block sizes, estimated quantity, site town and preferred date. If someone is managing the build for you in Ghana, tell us how you would like us to coordinate with them." },
  { title: "Agree the quote in Ghana cedis", text: "We review stock and local delivery options, then confirm the blocks, any charges, the deposit and the remaining balance. An online enquiry does not reserve stock or take payment." },
  { title: "Coordinate with the factory", text: "Confirm payment instructions directly with the factory. We verify the agreed deposit before accepting the order. Agree the receiving contact and ask the team what dispatch or collection updates they can provide." },
];

export default function BuildingFromAbroadPage() {
  return <PublicSiteShell><main className="rf-container rf-catalogue"><header className="rf-page-head"><p className="rf-eyebrow">FOR GHANAIANS ABROAD & OVERSEAS BUYERS</p><h1 className="rf-page-title">Building in Ghana<br/>from abroad?</h1><p>Plan your block supply from wherever you are. Get a written quote from our team in Kumasi and coordinate local delivery or factory pickup for your project in Ghana.</p><div className="rf-hero-actions"><Link href="/order" className="rf-button rf-button-dark">Request a quotation ↗</Link><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="rf-button rf-button-outline">Talk on WhatsApp ↗</a></div></header>
    <section className="rf-story-grid rf-abroad-story"><div className="rf-story-image"><Image src={HERO_IMAGE} alt="Digital illustration of Rexy solid and hollow concrete block types" fill sizes="(max-width: 800px) 100vw, 50vw" /></div><div className="rf-story-copy"><p className="rf-eyebrow">THE DETAILS WE NEED</p><h2 className="rf-page-title">Start with a clear plan.</h2><p>Include your block type, quantity, delivery location in Ghana and your preferred contact method. Use a phone number with its country code so we can reach you on WhatsApp.</p><Link className="rf-text-link" href="/blocks">Compare our blocks ↗</Link></div></section>
    <section className="rf-section"><p className="rf-eyebrow">HOW IT WORKS</p><h2>From enquiry to local supply.</h2><ol className="rf-steps">{steps.map((step, i) => <li className="rf-step" key={step.title}><span className="rf-step-number">0{i + 1}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol></section>
    <section className="rf-contact-panel"><h2>Confirm delivery before ordering.</h2><p>This service is for construction projects in Ghana. Delivery coverage and charges depend on your site. Contact the factory to confirm the options for your project.</p><Link className="rf-text-link" href="/contact">Get in touch ↗</Link></section>
  </main></PublicSiteShell>;
}

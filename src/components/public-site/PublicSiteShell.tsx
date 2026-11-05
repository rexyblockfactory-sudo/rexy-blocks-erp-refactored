import Link from "next/link";
import type { ReactNode } from "react";
import "./public-site.css";

export const WHATSAPP_URL = "https://wa.me/233547831902?text=" + encodeURIComponent("Hello Rexy Blocks Factory, I would like a quotation for concrete blocks.");
const navigation = [{ href: "/blocks", label: "Our blocks" }, { href: "/about", label: "Our story" }, { href: "/contact", label: "Contact" }];

export function Brand() {
  return <Link href="/" className="rf-brand" aria-label="Rexy Blocks Factory home"><span className="rf-mark" aria-hidden="true"><svg viewBox="0 0 36 36" fill="none"><path d="m5 11 13-7 13 7-13 7-13-7Z" fill="currentColor"/><path d="m5 17 13 7 13-7v6l-13 7-13-7v-6Z" fill="currentColor"/></svg></span><span>REXY BLOCKS<small>FACTORY Â· KUMASI, GHANA</small></span></Link>;
}
export default function PublicSiteShell({ children }: { children: ReactNode }) {
  return <div className="rf-site">
    <a href="#main-content" className="rf-skip">Skip to content</a>
    <div className="rf-topline"><div className="rf-container"><span>Solid foundations start here.</span><a href="tel:+233547831902">Letâ€™s talk blocks â†— &nbsp; +233 54 783 1902</a></div></div>
    <header className="rf-header"><div className="rf-container rf-header-inner"><Brand/><nav aria-label="Main navigation" className="rf-nav">{navigation.map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav><Link href="/order" className="rf-button rf-button-dark rf-header-cta">Get a quotation <span aria-hidden="true">â†—</span></Link><details className="rf-mobile-nav"><summary aria-label="Open navigation">Menu â˜°</summary><nav aria-label="Mobile navigation"><Link href="/">Home</Link>{navigation.map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}<Link href="/order">Request a quotation</Link><Link href="/login">Staff login</Link></nav></details></div></header>
    <div id="main-content" tabIndex={-1}>{children}</div>
    <footer className="rf-footer"><div className="rf-container"><div className="rf-footer-top"><div><p className="rf-eyebrow">LETâ€™S BUILD SOMETHING LASTING</p><h2>Your next project.<br/>Our next conversation.</h2></div><Link href="/order" className="rf-button rf-button-gold">Request a quotation <span aria-hidden="true">â†—</span></Link></div><div className="rf-footer-grid"><div><Brand/><p>Concrete blocks for the places<br/>we live, work, and grow.</p></div><div><h3>Explore</h3><Link href="/blocks">Our blocks</Link><Link href="/about">Our story</Link><Link href="/order">Request a quotation</Link></div><div><h3>Get in touch</h3><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsApp: +233 54 783 1902 â†—</a><a href="mailto:rexblocksfactory@gmail.com">rexblocksfactory@gmail.com</a><span>Kumasi, Ghana</span></div></div><div className="rf-footer-bottom"><span>Â© {new Date().getFullYear()} Rexy Blocks Factory</span><span>Built for strong foundations.</span><Link href="/login">Staff ERP login â†—</Link></div></div></footer>
  </div>;
}

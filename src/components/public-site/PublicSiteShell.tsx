import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/blocks", label: "Our blocks" },
  { href: "/about", label: "About us" },
  { href: "/contact", label: "Contact" },
];

export default function PublicSiteShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f7f3] text-[#17231d]">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f7f7f3]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Rexy Blocks Factory home">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#183b2b] text-lg font-black text-[#e6bd65]">R</span>
            <span>
              <span className="block text-sm font-black tracking-[0.16em]">REXY BLOCKS</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-[#637267]">Factory & Building Materials</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm font-semibold text-[#526057] transition hover:text-[#183b2b]">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden rounded-full border border-[#183b2b]/20 px-4 py-2.5 text-sm font-bold text-[#183b2b] transition hover:bg-[#183b2b]/5 sm:inline-flex">
              Staff login
            </Link>
            <Link href="/contact" className="rounded-full bg-[#d5a84e] px-4 py-2.5 text-sm font-extrabold text-[#17231d] transition hover:bg-[#e2bb6b]">
              Get a quote
            </Link>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-5 pb-3 md:hidden" aria-label="Mobile navigation">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap text-xs font-semibold text-[#526057]">
              {item.label}
            </Link>
          ))}
          <Link href="/login" className="whitespace-nowrap text-xs font-semibold text-[#183b2b]">Staff login</Link>
        </nav>
      </header>

      {children}

      <footer className="bg-[#14291f] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-3 lg:px-8">
          <div>
            <p className="text-lg font-black tracking-[0.14em]">REXY BLOCKS FACTORY</p>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/65">
              Quality concrete blocks and building materials for projects that need a strong foundation.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e6bd65]">Explore</p>
            <div className="mt-4 flex flex-col gap-3 text-sm text-white/75">
              <Link href="/blocks" className="hover:text-white">Our blocks</Link>
              <Link href="/about" className="hover:text-white">About Rexy</Link>
              <Link href="/contact" className="hover:text-white">Request a quotation</Link>
              <Link href="/login" className="hover:text-white">Staff ERP login</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e6bd65]">Contact</p>
            <a href="mailto:rexblocksfactory@gmail.com" className="mt-4 inline-block text-sm text-white/75 hover:text-white">rexblocksfactory@gmail.com</a>
            <p className="mt-3 text-sm text-white/55">Kumasi, Ghana</p>
          </div>
        </div>
        <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-white/45">
          © {new Date().getFullYear()} Rexy Blocks Factory. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

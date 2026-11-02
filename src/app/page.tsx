import Link from "next/link";
import PublicSiteShell from "@/components/public-site/PublicSiteShell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Product = { id: string; name: string; category: string | null; size: string | null; price: number | string | null };

async function getProducts(): Promise<Product[]> {
  try {
    const db = await createSupabaseServerClient();
    const { data, error } = await db.from("products").select("id,name,category,size,price").order("name").limit(4);
    if (error) { console.error("Public product read failed:", error.message); return []; }
    return (data ?? []) as Product[];
  } catch (error) { console.error("Public products unavailable:", error); return []; }
}

function money(value: Product["price"]) {
  const amount = Number(value);
  return Number.isFinite(amount) ? new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(amount) : "Request a quote";
}

export default async function HomePage() {
  const products = await getProducts();
  return <PublicSiteShell>
    <main>
      <section className="bg-[#183b2b] text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-24 md:grid-cols-2 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#e6bd65]">Built for strength. Made to last.</p>
            <h1 className="mt-6 text-5xl font-black leading-tight sm:text-7xl">Strong blocks.<br/><span className="text-[#e6bd65]">Stronger</span> foundations.</h1>
            <p className="mt-6 max-w-xl leading-8 text-white/70">Reliable concrete blocks and building materials for homes, commercial developments and construction projects in Ghana.</p>
            <div className="mt-9 flex flex-wrap gap-3"><Link href="/blocks" className="rounded-full bg-[#d5a84e] px-7 py-4 font-bold text-[#17231d]">Explore our blocks →</Link><Link href="/contact" className="rounded-full border border-white/30 px-7 py-4 font-bold">Request a quotation</Link></div>
            <div className="mt-14 flex gap-10 border-t border-white/15 pt-7"><div><b className="text-2xl text-[#e6bd65]">4</b><p className="text-xs text-white/60">Block varieties</p></div><div><b className="text-2xl text-[#e6bd65]">GH₵</b><p className="text-xs text-white/60">Local pricing</p></div><div><b className="text-2xl text-[#e6bd65]">Ghana</b><p className="text-xs text-white/60">Serving projects</p></div></div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#254a37] p-7">
            <p className="text-xs font-bold uppercase tracking-widest text-[#e6bd65]">Rexy quality · Concrete products</p>
            <div className="my-8 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-[#d9d8cf] p-4 text-[#26352b]"><p className="mb-6 text-xs font-bold">SOLID</p><div className="space-y-2"><div className="h-16 rounded border-4 border-[#858e83] bg-[#b5bbb0]"/><div className="h-16 rounded border-4 border-[#858e83] bg-[#b5bbb0]"/></div><b className="mt-5 block">Solid blocks</b></div>
              <div className="rounded-xl bg-[#c9c9be] p-4 text-[#26352b]"><p className="mb-6 text-xs font-bold">HOLLOW</p><div className="grid grid-cols-2 gap-2"><div className="h-36 rounded border-4 border-[#858e83] bg-[#b5bbb0]"/><div className="h-36 rounded border-4 border-[#858e83] bg-[#b5bbb0]"/></div><b className="mt-5 block">Hollow blocks</b></div>
            </div>
            <div className="rounded-xl bg-[#14291f] p-5"><b className="text-xl">Get the right blocks, at the right quantity.</b><p className="mt-2 text-sm text-white/60">Talk to our team about block sizes, quantities and delivery requirements.</p></div>
            <p className="mt-4 text-center text-xs text-white/50">Kumasi, Ghana</p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#9a7026]">Our products</p><h2 className="mt-3 text-4xl font-black">Blocks for every build.</h2><p className="mt-3 text-sm text-[#647168]">Prices are read from the existing factory product catalogue.</p></div><Link href="/blocks" className="font-bold text-[#183b2b] underline decoration-[#d5a84e]">View all products →</Link></div>
        {products.length ? <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{products.map(p=><article key={p.id} className="rounded-2xl border bg-white p-5"><div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-[#e8e9e2] p-5"><div className="w-full space-y-2"><div className="h-12 rounded border-4 border-[#858e83] bg-[#b5bbb0]"/><div className="h-12 rounded border-4 border-[#858e83] bg-[#b5bbb0]"/></div></div><p className="mt-5 text-xs uppercase text-[#9a7026]">{p.category||"Concrete block"}</p><h3 className="mt-2 font-bold">{p.name}</h3><p className="text-sm text-[#758077]">{p.size}</p><p className="mt-4 text-xl font-black">{money(p.price)}</p></article>)}</div> : <div className="mt-10 rounded-2xl border border-dashed bg-white p-8"><b>Live catalogue access is being prepared.</b><p className="mt-2 text-sm text-[#647168]">We have not weakened the ERP database permissions. Contact the factory for current product availability and prices.</p><Link href="/contact" className="mt-4 inline-block font-bold underline">Request current prices</Link></div>}
      </section>
      <section className="bg-[#e9ece5]"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-5 py-16 lg:px-8"><div><h2 className="text-3xl font-black">Tell us what your project needs.</h2><p className="mt-3 text-sm text-[#647168]">Share block sizes, quantities and your delivery location.</p></div><Link href="/contact" className="rounded-full bg-[#183b2b] px-7 py-4 font-bold text-white">Talk to the factory →</Link></div></section>
    </main>
  </PublicSiteShell>;
}
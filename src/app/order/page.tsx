import { publicMetadata } from "@/components/public-site/site-metadata";
import Link from "next/link";
import PublicSiteShell from "@/components/public-site/PublicSiteShell";
import OrderRequestForm from "@/components/public-site/OrderRequestForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Product = { id: string; name: string; category: string | null; size: string | null; price: number | string | null };
export const metadata = publicMetadata("Request a Quotation", "Request concrete block supply from Rexy Blocks Factory in Kumasi, Ghana.", "/order");

async function getProducts(): Promise<Product[]> {
  try {
    const db = await createSupabaseServerClient();
    const { data, error } = await db.from("products").select("id,name,category,size,price").order("name");
    if (error) { console.error("Order form product catalogue unavailable:", error.message); return []; }
    return (data ?? []) as Product[];
  } catch (error) { console.error("Order form product catalogue unavailable:", error); return []; }
}

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const products = await getProducts();
  const { product } = await searchParams;
  return <PublicSiteShell><main className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
    <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#9a7026]">Customer ordering</p><h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Request your blocks.</h1><p className="mt-5 text-sm leading-7 text-[#647168]">Tell us what you need, where you need it and when. We’ll review your request and agree a clear quotation. No payment is taken at this stage.</p></div>
    <div className="mx-auto mt-10 grid max-w-6xl items-start gap-8 lg:grid-cols-[1fr_18rem]"><OrderRequestForm products={products} initialProductId={product}/><aside className="rounded-3xl bg-[#183b2b] p-7 text-white"><p className="text-xs font-bold uppercase tracking-widest text-[#e6bd65]">How it works</p><ol className="mt-5 space-y-5 text-sm leading-6 text-white/75"><li><strong className="block text-white">1. Submit your request</strong>Choose a block type, quantity and fulfilment details.</li><li><strong className="block text-white">2. We check availability</strong>Our team reviews stock, production schedule and delivery needs.</li><li><strong className="block text-white">3. Confirm your order</strong>We agree the final price, payment and delivery before recording a sale.</li></ol><div className="mt-7 border-t border-white/15 pt-6"><p className="text-xs text-white/55">Need help before ordering?</p><a href="https://wa.me/233547831902" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-bold text-[#e6bd65] underline underline-offset-4">Chat with Rexy Blocks Factory</a><Link href="/blocks" className="mt-4 block text-sm font-semibold text-white underline underline-offset-4">Browse products</Link></div></aside></div>
  </main></PublicSiteShell>;
}

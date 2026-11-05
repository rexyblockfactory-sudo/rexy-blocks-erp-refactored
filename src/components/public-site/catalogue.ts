import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CatalogueProduct = { id: string; name: string; category: string | null; size: string | null; price: number | string | null };

export async function getCatalogue(): Promise<CatalogueProduct[]> {
  try {
    const db = await createSupabaseServerClient();
    const { data, error } = await db.from("products").select("id,name,category,size,price").order("name");
    if (error) { console.error("Product catalogue unavailable:", error.message); return []; }
    return (data ?? []) as CatalogueProduct[];
  } catch (error) { console.error("Product catalogue unavailable:", error); return []; }
}

export function productPrice(value: CatalogueProduct["price"]) {
  const amount = Number(value);
  return value !== null && Number.isFinite(amount) && amount > 0
    ? new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(amount)
    : "Ask for price";
}

export function productPath(product: CatalogueProduct) {
  const name = product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `/blocks/${name || "concrete-block"}-${product.id}`;
}

export const getCatalogueProduct = cache(async (slug: string) => {
  const id = slug.slice(-36);
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) return null;
  const db = await createSupabaseServerClient();
  const { data, error } = await db.from("products").select("id,name,category,size,price").eq("id", id).maybeSingle();
  if (error) throw new Error("Product catalogue lookup failed.", { cause: error });
  return data as CatalogueProduct | null;
});

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

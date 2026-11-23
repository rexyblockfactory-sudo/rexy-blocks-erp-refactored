import Link from "next/link";
import { redirect } from "next/navigation";

import { hasPermission } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import Checkout from "./checkout";

export default async function PointOfSalePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !hasPermission(profile.role as UserRole, "sales")) {
    return (
      <section className="p-6">
        <h1 className="text-2xl font-bold">Point of sale</h1>
        <p className="mt-2">A staff account with sales access is required.</p>
      </section>
    );
  }

  const [products, customers] = await Promise.all([
    supabase.from("products").select("id, name, category, size, price").order("name"),
    supabase.from("customers").select("id, customer_name").order("customer_name"),
  ]);

  return (
    <section className="mx-auto max-w-7xl space-y-5 px-4 py-6 text-slate-900 sm:px-6 xl:px-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Point of sale</h1>
        <Link href="/sales/history" className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold hover:bg-slate-50">
          Sales history
        </Link>
      </header>
      {products.error || customers.error ? (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-900">
          Checkout could not load the product and customer records. Refresh this page to try again.
        </p>
      ) : (
        <Checkout products={products.data ?? []} customers={customers.data ?? []} />
      )}
    </section>
  );
}

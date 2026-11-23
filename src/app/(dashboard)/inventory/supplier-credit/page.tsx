import { getStaffAccess } from "@/lib/staff-access";
import { canManageSupplierCredit } from "@/lib/supplier-credit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SupplierCredit from "./supplier-credit";

export default async function SupplierCreditPage() {
  const access = await getStaffAccess();
  if (access.status !== "staff" || !canManageSupplierCredit(access.role)) {
    return <p className="p-6">Supplier credit access is restricted.</p>;
  }

  const supabase = await createSupabaseServerClient();
  const [inventory, credits] = await Promise.all([
    supabase.from("inventory").select("id, item_name, unit").eq("category", "Raw Material").order("item_name"),
    supabase.from("supplier_credit_purchases")
      .select("id, supplier, material, quantity, unit, invoice_reference, total, created_at, payments:supplier_credit_payments(id, amount, reference, created_at)")
      .order("created_at", { ascending: false })
      .order("created_at", { referencedTable: "payments", ascending: false }),
  ]);

  return (
    <section className="mx-auto max-w-6xl space-y-6 p-4 text-slate-900 md:p-8">
      <h1 className="text-3xl font-bold">Supplier credit</h1>
      {inventory.error || credits.error ? (
        <p role="alert">Supplier credit could not load. Refresh the page to try again.</p>
      ) : (
        <SupplierCredit items={inventory.data ?? []} credits={credits.data ?? []} />
      )}
    </section>
  );
}

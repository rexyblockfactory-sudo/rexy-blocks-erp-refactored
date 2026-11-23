"use client";

import { useRef, useState, useTransition } from "react";
import type { FormEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Material = { id: string; item_name: string; unit: string };
type Payment = { id: string; amount: number; reference: string | null; created_at: string };
type Credit = {
  id: string;
  supplier: string;
  material: string;
  quantity: number;
  unit: string;
  invoice_reference: string | null;
  total: number;
  created_at: string;
  payments: Payment[];
};

const currency = new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", currencyDisplay: "narrowSymbol" });
const date = new Intl.DateTimeFormat("en-GH", { dateStyle: "medium", timeZone: "Africa/Accra" });
const card = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6";
const field = "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base";
const button = "min-h-11 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-medium">{label}{children}</label>;
}

function CreditForm({ children, submitLabel, action, disabled }: {
  children: ReactNode;
  submitLabel: string;
  disabled?: boolean;
  action: (fields: FormData, id: string) => Promise<{ error: { message: string } | null; status: number }>;
}) {
  const router = useRouter();
  const request = useRef<{ id: string; fields: FormData } | null>(null);
  const inFlight = useRef(false);
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(false);
  const [refreshing, refresh] = useTransition();
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget;
    request.current ??= { id: crypto.randomUUID(), fields: new FormData(form) };
    inFlight.current = true;
    setSaving(true);
    setMessage("");

    try {
      const result = await action(request.current.fields, request.current.id);
      if (result.error) {
        if (!result.status || result.status >= 500) throw new Error(result.error.message);
        request.current = null;
        setRetry(false);
        setMessage(result.error.message);
        return;
      }

      request.current = null;
      setRetry(false);
      form.reset();
      setMessage("Saved.");
      refresh(() => router.refresh());
    } catch {
      setRetry(true);
      setMessage("The connection was interrupted. Retry to confirm this entry.");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <fieldset disabled={disabled || saving || refreshing || retry} className="min-w-0 space-y-3">
        {children}
      </fieldset>
      <button type="submit" className={button} disabled={disabled || saving || refreshing}>
        {saving ? "Saving…" : retry ? "Retry" : submitLabel}
      </button>
      {message && <p role="status" className="text-sm">{message}</p>}
    </form>
  );
}

export default function SupplierCredit({ items, credits }: { items: Material[]; credits: Credit[] }) {
  const purchases = credits.map(credit => {
    const paid = credit.payments.reduce((sum, payment) => sum + Math.round(Number(payment.amount) * 100), 0);
    return { ...credit, balance: (Math.round(Number(credit.total) * 100) - paid) / 100 };
  });
  const supplierBalances = new Map<string, { name: string; cents: number }>();
  for (const credit of purchases) {
    if (credit.balance <= 0) continue;
    const key = credit.supplier.toLowerCase();
    const previous = supplierBalances.get(key);
    supplierBalances.set(key, { name: previous?.name ?? credit.supplier, cents: (previous?.cents ?? 0) + Math.round(credit.balance * 100) });
  }
  const outstanding = Array.from(supplierBalances.values());

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <section className={card}>
        <h2 className="mb-4 text-xl font-bold">Receive materials on credit</h2>
        {!items.length && <p className="mb-4">Add a raw material to Inventory to record a receipt.</p>}
        <CreditForm submitLabel="Receive stock" disabled={!items.length} action={async (data, id) =>
          await supabase.rpc("receive_supplier_credit", {
            p_id: id,
            p_inventory_id: String(data.get("material")),
            p_supplier: String(data.get("supplier")),
            p_quantity: String(data.get("quantity")),
            p_total: String(data.get("total")),
            p_upfront: String(data.get("upfront") || "0"),
            p_reference: String(data.get("reference")),
          })
        }>
          <Field label="Supplier"><input className={field} name="supplier" required maxLength={160} /></Field>
          <Field label="Raw material">
            <select className={field} name="material" required defaultValue="">
              <option value="">Choose material</option>
              {items.map(item => <option key={item.id} value={item.id}>{item.item_name} ({item.unit})</option>)}
            </select>
          </Field>
          <Field label="Quantity received in the selected unit"><input className={field} name="quantity" type="number" min="0.0001" step="any" inputMode="decimal" required /></Field>
          <Field label="Total purchase cost (GH₵)"><input className={field} name="total" type="number" min="0.01" step="0.01" inputMode="decimal" required /></Field>
          <Field label="Paid upfront (GH₵)"><input className={field} name="upfront" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" /></Field>
          <Field label="Supplier invoice reference (optional)"><input className={field} name="reference" maxLength={160} /></Field>
        </CreditForm>
      </section>

      <div className="min-w-0 space-y-4">
        <section className={card}>
          <h2 className="text-xl font-bold">Outstanding by supplier</h2>
          <p className="mt-2 text-2xl font-bold">{currency.format(outstanding.reduce((sum, supplier) => sum + supplier.cents, 0) / 100)}</p>
          <ul className="mt-3 divide-y">
            {outstanding.map(supplier => <li key={supplier.name} className="flex flex-wrap justify-between gap-2 py-2"><span className="break-all">{supplier.name}</span><span>{currency.format(supplier.cents / 100)}</span></li>)}
          </ul>
        </section>
        <h2 className="text-xl font-bold">Credit purchases</h2>
        {!purchases.length && <p>No credit purchases recorded.</p>}
        {purchases.map(credit => (
          <details className={card} key={credit.id}>
            <summary className="cursor-pointer space-y-1">
              <span className="font-semibold">{credit.supplier} · {credit.material}</span>
              <span className="block text-sm">{date.format(new Date(credit.created_at))} · {credit.quantity} {credit.unit}</span>
              <span className="block font-semibold">{credit.balance > 0 ? `${currency.format(credit.balance)} due` : "Paid in full"}</span>
            </summary>
            <div className="mt-4 space-y-4 border-t pt-4">
              <p>Total purchase cost {currency.format(credit.total)}{credit.invoice_reference && ` · Invoice ${credit.invoice_reference}`}</p>
              <div>
                <h3 className="font-semibold">Payment history</h3>
                {credit.payments.length ? (
                  <ul className="divide-y">
                    {credit.payments.map(payment => <li key={payment.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{date.format(new Date(payment.created_at))}{payment.reference && ` · ${payment.reference}`}</span><span>{currency.format(payment.amount)}</span></li>)}
                  </ul>
                ) : <p className="text-sm text-slate-600">No payments recorded.</p>}
              </div>
              {credit.balance > 0 && (
                <CreditForm submitLabel="Record payment" action={async (data, id) =>
                  await supabase.rpc("pay_supplier_credit", {
                    p_id: id,
                    p_credit_id: credit.id,
                    p_amount: String(data.get("amount")),
                    p_reference: String(data.get("reference")),
                  })
                }>
                  <Field label="Payment amount (GH₵)"><input className={field} name="amount" type="number" min="0.01" max={credit.balance} step="0.01" inputMode="decimal" required /></Field>
                  <Field label="Payment reference (optional)"><input className={field} name="reference" maxLength={160} /></Field>
                </CreditForm>
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

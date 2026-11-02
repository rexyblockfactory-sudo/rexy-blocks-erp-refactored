"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Order = {
  id: string; reference: string; customer_name: string; customer_phone: string;
  product_name: string; product_size: string | null; quantity: number;
  fulfilment_type: string; fulfilment_location: string | null; requested_date: string | null;
  customer_notes: string | null; status: string; quoted_subtotal: number | null;
  delivery_charge: number | null; additional_charges: number | null; quoted_total: number | null;
  deposit_percent: number; deposit_required: number | null; amount_paid: number;
  balance_due: number | null; staff_notes: string | null; deposit_verified_at: string | null;
  created_at: string;
};

const money = (value: number | null | undefined) => new Intl.NumberFormat("en-GH", {
  style: "currency", currency: "GHS", minimumFractionDigits: 2,
}).format(Number(value ?? 0));

export default function WebsiteOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [delivery, setDelivery] = useState("0");
  const [additional, setAdditional] = useState("0");
  const [depositPercent, setDepositPercent] = useState("50");
  const [staffNotes, setStaffNotes] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Mobile Money");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/website-orders", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load requests.");
      setOrders(result.orders ?? []);
      setSelectedId((current) => current && (result.orders ?? []).some((o: Order) => o.id === current) ? current : result.orders?.[0]?.id ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load requests.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadOrders(); }, [loadOrders]);

  const selected = orders.find((order) => order.id === selectedId) ?? null;
  useEffect(() => {
    if (!selected) return;
    setSubtotal(selected.quoted_subtotal == null ? "" : String(selected.quoted_subtotal));
    setDelivery(String(selected.delivery_charge ?? 0));
    setAdditional(String(selected.additional_charges ?? 0));
    setDepositPercent(String(selected.deposit_percent ?? 50));
    setStaffNotes(selected.staff_notes ?? "");
    setPaymentAmount(selected.deposit_required != null && selected.amount_paid < selected.deposit_required
      ? String(Math.max(0, selected.deposit_required - selected.amount_paid).toFixed(2))
      : "");
    setPaymentReference(""); setPaymentNotes("");
    setNotice("");
  }, [selected]);

  const quoteTotal = useMemo(() => Number(subtotal) + Number(delivery) + Number(additional), [subtotal, delivery, additional]);
  const depositDue = useMemo(() => Math.round(quoteTotal * Number(depositPercent)) / 100, [quoteTotal, depositPercent]);

  async function send(path: string, method: string, body: unknown) {
    const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The operation failed.");
    return result;
  }

  async function saveQuote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected || saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await send(`/api/website-orders/${selected.id}/quote`, "PATCH", {
        quoted_subtotal: Number(subtotal), delivery_charge: Number(delivery),
        additional_charges: Number(additional), deposit_percent: Number(depositPercent), staff_notes: staffNotes,
      });
      setNotice("Quote saved. The order is now awaiting verified deposit payment.");
      await loadOrders();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save quote."); }
    finally { setSaving(false); }
  }

  async function acceptOrder() {
    if (!selected || saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await send(`/api/website-orders/${selected.id}/accept`, "POST", {});
      setNotice("Order accepted and confirmed by management. It is still not an ERP sale until the separate conversion step is completed.");
      await loadOrders();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to accept order."); }
    finally { setSaving(false); }
  }

  async function recordPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected || saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await send(`/api/website-orders/${selected.id}/payments`, "POST", {
        amount: Number(paymentAmount), payment_method: paymentMethod,
        reference: paymentReference, notes: paymentNotes,
      });
      setNotice("Payment recorded and verified. The order status and remaining balance have been updated.");
      await loadOrders();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to verify payment."); }
    finally { setSaving(false); }
  }

  return <main className="space-y-6 p-5 md:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-3xl font-bold tracking-tight">Website orders</h1><p className="mt-1 text-sm text-gray-600">Review customer requests, issue quotes and verify deposits.</p></div>
      <button onClick={() => void loadOrders()} disabled={loading} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50">{loading ? "Refreshing…" : "Refresh"}</button>
    </div>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      Public requests do not reserve stock or create ERP sales. The default deposit is 50% of the full agreed total, including delivery and additional charges. Only authorised staff can issue quotes or verify payments.
    </div>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    {notice && <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">{notice}</div>}
    {loading ? <div className="rounded-xl border bg-white p-10 text-center text-gray-500">Loading website orders…</div> : orders.length === 0 ? <div className="rounded-xl border bg-white p-10 text-center"><p className="font-semibold">No website requests yet.</p><p className="mt-1 text-sm text-gray-500">New customer requests submitted through the public order page will appear here.</p></div> :
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.9fr)]">
        <section className="overflow-hidden rounded-xl border bg-white">
          <div className="border-b px-4 py-3"><h2 className="font-semibold">Requests ({orders.length})</h2></div>
          <div className="max-h-[75vh] divide-y overflow-y-auto">
            {orders.map((order) => <button key={order.id} onClick={() => setSelectedId(order.id)} className={`block w-full px-4 py-4 text-left hover:bg-gray-50 ${selectedId === order.id ? "bg-emerald-50 ring-1 ring-inset ring-emerald-200" : ""}`}>
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold">{order.customer_name}</p><p className="mt-1 text-xs text-gray-500">{order.reference} · {order.product_name} · {order.quantity.toLocaleString()} blocks</p></div><span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold">{order.status.replaceAll("_", " ")}</span></div>
              <div className="mt-2 flex justify-between gap-3 text-xs text-gray-500"><span>{new Date(order.created_at).toLocaleString("en-GH")}</span><span>{order.quoted_total == null ? "Not quoted" : money(order.quoted_total)}</span></div>
            </button>)}
          </div>
        </section>
        {selected && <section className="space-y-5 rounded-xl border bg-white p-5">
          <div><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">{selected.reference}</h2><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">{selected.status.replaceAll("_", " ")}</span></div>
            <p className="mt-2 font-semibold">{selected.customer_name} · {selected.customer_phone}</p>
            <p className="mt-1 text-sm text-gray-600">{selected.product_name}{selected.product_size ? " · " + selected.product_size : ""} · {selected.quantity.toLocaleString()} blocks</p>
            <p className="mt-1 text-sm text-gray-600">{selected.fulfilment_type}: {selected.fulfilment_location || "Factory"}</p>
            {selected.requested_date && <p className="mt-1 text-sm text-gray-600">Requested date: {selected.requested_date}</p>}
            {selected.customer_notes && <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">{selected.customer_notes}</p>}
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-3 text-center"><div><p className="text-xs text-gray-500">Agreed total</p><p className="mt-1 text-sm font-bold">{money(selected.quoted_total)}</p></div><div><p className="text-xs text-gray-500">Paid</p><p className="mt-1 text-sm font-bold">{money(selected.amount_paid)}</p></div><div><p className="text-xs text-gray-500">Balance</p><p className="mt-1 text-sm font-bold">{money(selected.balance_due)}</p></div></div>
          {selected.status === "pending_review" && <form onSubmit={saveQuote} className="space-y-3 border-t pt-5">
            <h3 className="font-bold">Prepare final quote</h3>
            <label className="block text-sm font-medium">Agreed blocks subtotal (GH₵)<input required type="number" min="0.01" step="0.01" value={subtotal} onChange={e=>setSubtotal(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"/></label>
            <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">Delivery charge (GH₵)<input required type="number" min="0" step="0.01" value={delivery} onChange={e=>setDelivery(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"/></label><label className="block text-sm font-medium">Other charges (GH₵)<input required type="number" min="0" step="0.01" value={additional} onChange={e=>setAdditional(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"/></label></div>
            <label className="block text-sm font-medium">Deposit percentage (default 50%)<input required type="number" min="1" max="100" step="0.01" value={depositPercent} onChange={e=>setDepositPercent(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"/></label>
            <label className="block text-sm font-medium">Internal staff notes (optional)<textarea rows={2} maxLength={2000} value={staffNotes} onChange={e=>setStaffNotes(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"/></label>
            <div className="rounded-lg bg-emerald-50 p-3 text-sm"><div className="flex justify-between"><span>Total including all charges</span><strong>{money(quoteTotal)}</strong></div><div className="mt-1 flex justify-between"><span>Deposit due ({depositPercent || 0}%)</span><strong>{money(depositDue)}</strong></div></div>
            <button disabled={saving||!Number.isFinite(quoteTotal)||quoteTotal<=0||!Number.isFinite(depositDue)||depositDue<=0} className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save quote and request deposit"}</button>
          </form>}
          {selected.status === "deposit_received" && <div className="space-y-3 border-t pt-5">
            <h3 className="font-bold">Deposit verified — management acceptance required</h3>
            <p className="text-sm text-gray-600">The required deposit has been recorded. An administrator or manager must now confirm that the factory accepts this order before it becomes Confirmed.</p>
            <button type="button" onClick={() => void acceptOrder()} disabled={saving} className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? "Accepting…" : "Accept and confirm order"}</button>
          </div>}
          {["awaiting_deposit","deposit_received","confirmed"].includes(selected.status) && <form onSubmit={recordPayment} className="space-y-3 border-t pt-5">
            <h3 className="font-bold">{selected.amount_paid > 0 ? "Record additional payment" : "Verify customer payment"}</h3>
            <p className="text-xs text-gray-500">Only record money received and independently verified by authorised staff. Deposit required: {money(selected.deposit_required)}.</p>
            <label className="block text-sm font-medium">Amount received (GH₵)<input required type="number" min="0.01" max={Math.max(0, Number(selected.balance_due ?? 0))} step="0.01" value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"/></label>
            <label className="block text-sm font-medium">Payment method<select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2"><option>Mobile Money</option><option>Bank Transfer</option><option>Cash at Factory</option><option>Other verified method</option></select></label>
            <label className="block text-sm font-medium">Transaction / receipt reference (optional)<input maxLength={120} value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"/></label>
            <label className="block text-sm font-medium">Verification notes (optional)<textarea maxLength={500} rows={2} value={paymentNotes} onChange={e=>setPaymentNotes(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"/></label>
            <button disabled={saving||!Number.isFinite(Number(paymentAmount))||Number(paymentAmount)<=0||Number(paymentAmount)>Number(selected.balance_due??0)} className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? "Recording…" : "Record verified payment"}</button>
          </form>}
          {selected.status === "deposit_received" && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">The deposit has been verified. Management acceptance is still required before the order becomes Confirmed.</p>}
          {selected.status === "confirmed" && <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">This order is accepted and confirmed. Sale conversion remains a separate controlled step; this request has not deducted finished-goods stock or created an invoice.</p>}
          {selected.status === "converted" && <p className="text-sm text-green-700">Converted to ERP sale.</p>}
        </section>}
      </div>}
  </main>;
}

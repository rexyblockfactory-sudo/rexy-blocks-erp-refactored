"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { FormEvent } from "react";

import { supabase } from "@/lib/supabase/client";
import { createSale } from "@/services/sales";
import type { Product } from "@/types/product";
import type { Sale } from "@/types/sale";

type CheckoutProduct = Pick<Product, "id" | "name" | "category" | "size" | "price">;
type Customer = { id: string; customer_name: string };

const paymentMethods = ["Cash", "Mobile Money", "Credit"] as const;
type PaymentMethod = (typeof paymentMethods)[number];
const money = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  currencyDisplay: "narrowSymbol",
});

const field = "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base";
const panel = "min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6";
const primary = "min-h-12 w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50";

export default function Checkout({ products, customers }: {
  products: CheckoutProduct[];
  customers: Customer[];
}) {
  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState("");
  const [customer, setCustomer] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [payment, setPayment] = useState<PaymentMethod>("Cash");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sale, setSale] = useState<Sale | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const submitting = useRef(false);

  const query = search.trim().toLowerCase();
  const matches = products.filter((product) =>
    [product.name, product.category, product.size].some((value) =>
      value?.toLowerCase().includes(query)
    )
  );
  const selected = products.find((product) => product.id === productId);
  const price = Number(selected?.price);
  const count = Number(quantity);
  const validQuantity = Number.isInteger(count) && count > 0 && count <= 2147483647;
  const ready = Boolean(selected && customer && validQuantity && Number.isFinite(price) && price > 0);

  async function completeSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || !selected || submitting.current || sale || uncertain) return;

    submitting.current = true;
    setSaving(true);
    setError("");

    try {
      const result = await createSale({
        customer_name: customer,
        product_id: selected.id,
        quantity: count,
        payment_method: payment,
      });

      if (!result.data) {
        setError(result.error?.message ?? "The sale could not be confirmed.");
        if (result.outcomeUnknown) setUncertain(true);
        return;
      }

      setSale(result.data);
      const { data: invoice } = await supabase
        .from("invoices")
        .select("id")
        .eq("sale_id", result.data.id)
        .maybeSingle();

      setInvoiceId(invoice?.id ?? null);
    } catch {
      setUncertain(true);
      setError("The connection was interrupted.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  function startNextSale() {
    setSale(null);
    setInvoiceId(null);
    setSearch("");
    setProductId("");
    setCustomer("");
    setQuantity("1");
    setPayment("Cash");
    setError("");
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,27rem)]">
      <section className={panel} aria-labelledby="products-title">
        <h2 id="products-title" className="text-xl font-bold">Products</h2>
        <label htmlFor="pos-search" className="mt-4 block font-medium">Find a block</label>
        <input id="pos-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by size or name" className={`${field} mt-2`} />
        <div className="mt-4 grid grid-cols-1 gap-3 min-[375px]:grid-cols-2">
          {matches.map((product) => {
            const amount = Number(product.price);
            const available = Number.isFinite(amount) && amount > 0;
            const active = productId === product.id;

            return (
              <button key={product.id} type="button" aria-pressed={active}
                disabled={!available || saving || Boolean(sale) || uncertain}
                onClick={() => setProductId(product.id)}
                className={`min-w-0 rounded-xl border p-3 text-left disabled:opacity-60 sm:p-4 ${
                  active ? "border-blue-700 bg-blue-50 ring-1 ring-blue-700" : "border-slate-200 hover:border-blue-600"
                }`}>
                <span className="block break-words font-semibold">{product.name}</span>
                <span className="mt-2 block text-sm font-medium text-slate-700">
                  {available ? `${money.format(amount)} / block` : "Price unavailable"}
                </span>
              </button>
            );
          })}
        </div>
        {!matches.length && <p className="mt-3 text-slate-600">No products found.</p>}
      </section>

      <section className={panel} aria-labelledby="checkout-title">
        {sale ? (
          <div className="space-y-4">
            <h2 id="checkout-title" className="text-xl font-bold">Sale recorded</h2>
            <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-900">
              {sale.quantity} × {sale.product_name} · {money.format(sale.total_amount)}
            </p>
            <dl className="grid grid-cols-2 gap-3">
              <dt>Customer</dt><dd className="break-words text-right">{sale.customer_name}</dd>
              <dt>Payment method</dt><dd className="text-right">{sale.payment_method}</dd>
              <dt>Amount paid</dt><dd className="text-right">{money.format(sale.amount_paid)}</dd>
              <dt>Balance due</dt><dd className="text-right">{money.format(sale.balance_due)}</dd>
            </dl>
            <Link href={invoiceId ? `/invoices/${invoiceId}` : "/invoices"}
              className="block rounded-xl border border-slate-300 px-4 py-3 text-center font-semibold hover:bg-slate-50">
              {invoiceId ? "View or print invoice" : "Open invoices"}
            </Link>
            <button type="button" onClick={startNextSale} disabled={saving} className={primary}>
              Start next sale
            </button>
          </div>
        ) : (
          <form onSubmit={completeSale} className="space-y-4">
            <h2 id="checkout-title" className="text-xl font-bold">Checkout</h2>
            <p className="rounded-xl bg-slate-100 p-3 font-medium">{selected?.name ?? "Select a product"}</p>
            <fieldset disabled={saving || uncertain} className="min-w-0 space-y-4">
              <label className="block font-medium">
                Customer
                <select required className={`${field} mt-2`} value={customer} onChange={(event) => setCustomer(event.target.value)}>
                  <option value="">Select customer</option>
                  {customers.map(({ id, customer_name }) =>
                    <option key={id} value={customer_name}>{customer_name}</option>
                  )}
                </select>
              </label>
              <label className="block font-medium">
                Quantity
                <input required type="number" min="1" max="2147483647" step="1" inputMode="numeric" value={quantity}
                  onChange={(event) => setQuantity(event.target.value)} className={`${field} mt-2`} />
              </label>
              <fieldset>
                <legend className="font-medium">Payment method</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {paymentMethods.map((method) => (
                    <label key={method} className="cursor-pointer">
                      <input type="radio" name="pos-payment" value={method} checked={payment === method}
                        onChange={() => setPayment(method)} className="peer sr-only" />
                      <span className="flex min-h-12 items-center rounded-xl border border-slate-300 px-3 font-medium peer-checked:border-blue-700 peer-checked:bg-blue-50 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-700">
                        {method}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </fieldset>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4">
              <span className="font-semibold">Estimated total</span>
              <output className="text-2xl font-bold tabular-nums">
                {selected && validQuantity ? money.format(price * count) : money.format(0)}
              </output>
            </div>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-900">{error}</p>}
            {uncertain && (
              <p className="text-sm text-slate-700">
                Check <Link href="/sales/history" className="font-semibold underline">sales history</Link> for this sale before submitting it again.
              </p>
            )}
            <button type="submit" className={primary} disabled={!ready || saving || uncertain}>
              {saving ? "Recording sale…" : "Record sale"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

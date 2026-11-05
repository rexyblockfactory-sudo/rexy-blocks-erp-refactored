import { notFound } from "next/navigation";
import { depositPesewas, getTrackedOrder } from "@/lib/website-order-tracking";
import { paystackSecret } from "@/lib/paystack-deposits";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your Rexy Blocks quote",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const statusLabels: Record<string, string> = {
  pending_review: "Request under review",
  awaiting_deposit: "Awaiting deposit",
  deposit_received: "Deposit received, awaiting factory acceptance",
  confirmed: "Order confirmed",
  converted: "Order confirmed",
  declined: "Request declined",
  cancelled: "Request cancelled",
};
const notices: Record<string, string> = {
  retry: "Checkout could not open. Try again or contact the factory before sending a separate payment.",
  email: "Enter a valid email address for your payment receipt.",
  unavailable: "Online checkout is unavailable for this quote. Contact the factory for help.",
};
const money = (amount: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(amount);

export default async function QuotePage({ params, searchParams }: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { token } = await params;
  const [{ notice }, order] = await Promise.all([searchParams, getTrackedOrder(token)]);
  if (!order) notFound();
  const deposit = depositPesewas(order);
  const canPay = Boolean(paystackSecret() && process.env.WEBSITE_ORDER_CHECKOUT_ORIGIN &&
    order.status === "awaiting_deposit" && deposit > 0);
  const status = statusLabels[order.status] ?? "Contact the factory for an update";

  return (
    <main className="min-h-screen bg-[#eef3ef] px-4 py-10 text-[#192d26] sm:py-16">
      <article className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-[#dfe7e2] bg-white shadow-sm">
        <header className="bg-[#204a39] p-6 text-white sm:p-8">
          <p className="text-xs font-semibold tracking-widest text-[#efcc86] uppercase">Rexy Blocks Factory</p>
          <h1 className="mt-2 text-3xl font-semibold">Your quote</h1>
          <p className="mt-2 text-sm text-[#d7e5dc]">{order.reference}</p>
        </header>
        <div className="space-y-6 p-6 sm:p-8">
          <p className="rounded-lg bg-[#e9f1ec] px-4 py-3 text-sm font-semibold">{status}</p>
          <div>
            <h2 className="text-lg font-semibold">{order.product_name}</h2>
            <p className="text-sm text-[#52685d]">{Number(order.quantity).toLocaleString("en-GH")} blocks · {order.fulfilment_type}</p>
          </div>
          {order.quoted_total != null && (
            <dl className="divide-y divide-[#dfe7e2] text-sm">
              {[
                ["Blocks", order.quoted_subtotal],
                ["Delivery", order.delivery_charge],
                ["Additional charges", order.additional_charges],
                ["Quote total", order.quoted_total],
                ["Required deposit", order.deposit_required],
                ["Payments recorded on this request", order.amount_paid],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-3"><dt>{label}</dt><dd className="font-semibold tabular-nums">{money(Number(value ?? 0))}</dd></div>
              ))}
            </dl>
          )}
          {notice && Object.hasOwn(notices, notice) && <p role="alert" className="text-sm text-amber-900">{notices[notice]}</p>}
          {canPay && (
            <form action={`/api/quote/${token}/checkout`} method="post" target="_blank" rel="noopener noreferrer" className="space-y-3 rounded-xl border border-[#dfe7e2] p-4">
              <label className="block text-sm font-semibold">Email for your payment receipt
                <input name="email" type="email" autoComplete="email" maxLength={254} required className="mt-2 w-full rounded-lg border px-3 py-2" />
              </label>
              <button className="rounded-lg bg-[#204a39] px-4 py-2.5 text-sm font-semibold text-white">Pay deposit of {money(deposit / 100)} with Paystack</button>
              <p className="text-xs text-[#52685d]">Checkout opens in a new tab. Return here and refresh to check confirmation before trying again.</p>
            </form>
          )}
          <p className="text-sm text-[#52685d]">Keep this link private. Contact the factory on <a href="tel:+233547831902" className="underline">+233 54 783 1902</a> for pickup or delivery arrangements.</p>
        </div>
      </article>
    </main>
  );
}

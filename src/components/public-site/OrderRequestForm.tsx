"use client";

import { FormEvent, useMemo, useState } from "react";
import BlockProductVisual from "@/components/public-site/BlockProductVisual";

type Product = { id: string; name: string; category: string | null; size: string | null; price: number | string | null };

export default function OrderRequestForm({ products }: { products: Product[] }) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("100");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [fulfilment, setFulfilment] = useState<"Delivery" | "Factory pickup">("Delivery");
  const [requestedDate, setRequestedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const selectedProduct = products.find((product) => product.id === productId);
  const quantityValue = Number(quantity);
  const unitPrice = Number(selectedProduct?.price);
  const estimate = useMemo(() => {
    if (!Number.isSafeInteger(quantityValue) || quantityValue <= 0 || !Number.isFinite(unitPrice) || unitPrice <= 0) return null;
    return quantityValue * unitPrice;
  }, [quantityValue, unitPrice]);

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !Number.isSafeInteger(quantityValue) || quantityValue <= 0) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/website-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName.trim(), customer_phone: customerPhone.trim(), product_id: productId,
          quantity: quantityValue, fulfilment_type: fulfilment, fulfilment_location: deliveryLocation.trim(),
          requested_date: requestedDate || null, customer_notes: notes.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to submit your request.");
      setFeedback({ type: "success", message: "Your order request has been sent to Rexy Blocks Factory. Our team will review availability and contact you to agree the final price and deposit." });
      setCustomerName(""); setCustomerPhone(""); setDeliveryLocation(""); setRequestedDate(""); setNotes(""); setQuantity("100");
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Unable to submit your request. Please contact the factory on WhatsApp." });
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={submitOrder} className="space-y-6 rounded-3xl border border-[#dfe3dc] bg-white p-6 shadow-sm sm:p-8">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#9a7026]">Customer details</p><div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Full name<input required maxLength={100} value={customerName} onChange={(e)=>setCustomerName(e.target.value)} className="mt-2 w-full rounded-xl border border-[#d5dbd3] px-4 py-3 font-normal outline-none focus:border-[#183b2b]" placeholder="Your name"/></label>
        <label className="block text-sm font-semibold">Contact number<input required type="tel" maxLength={30} value={customerPhone} onChange={(e)=>setCustomerPhone(e.target.value)} className="mt-2 w-full rounded-xl border border-[#d5dbd3] px-4 py-3 font-normal outline-none focus:border-[#183b2b]" placeholder="+233..."/></label>
      </div></div>
      <div className="border-t border-[#edf0eb] pt-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#9a7026]">What would you like to order?</p>
        {selectedProduct && <div className="mt-4 grid gap-4 rounded-2xl bg-[#f5f6f1] p-3 sm:grid-cols-[150px_1fr] sm:items-center"><BlockProductVisual product={selectedProduct} className="aspect-[4/3]"/><div><p className="font-bold text-[#183b2b]">{selectedProduct.name}</p><p className="mt-1 text-sm text-[#647168]">{selectedProduct.size || selectedProduct.category || "Concrete block"}</p><p className="mt-2 text-lg font-black text-[#9a7026]">{Number.isFinite(unitPrice) && unitPrice > 0 ? new Intl.NumberFormat("en-GH",{style:"currency",currency:"GHS"}).format(unitPrice) : "Price on request"} <span className="text-xs font-normal text-[#647168]">per block</span></p></div></div>}
        {products.length ? <label className="mt-4 block text-sm font-semibold">Block product<select required value={productId} onChange={(e)=>setProductId(e.target.value)} className="mt-2 w-full rounded-xl border border-[#d5dbd3] bg-white px-4 py-3 font-normal">{products.map((p)=><option key={p.id} value={p.id}>{p.name}{p.size ? " · "+p.size : ""}</option>)}</select></label> : <p className="mt-4 rounded-xl bg-[#f5f6f1] p-4 text-sm text-[#647168]">The live catalogue is not available right now. Please contact the factory on WhatsApp to describe the block size you need.</p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Quantity (blocks)<input required type="number" min="1" max="1000000" step="1" inputMode="numeric" value={quantity} onChange={(e)=>setQuantity(e.target.value)} className="mt-2 w-full rounded-xl border border-[#d5dbd3] px-4 py-3 font-normal outline-none focus:border-[#183b2b]"/></label>
        <label className="block text-sm font-semibold">Fulfilment<select value={fulfilment} onChange={(e)=>setFulfilment(e.target.value as "Delivery"|"Factory pickup")} className="mt-2 w-full rounded-xl border border-[#d5dbd3] bg-white px-4 py-3 font-normal"><option>Delivery</option><option>Factory pickup</option></select></label></div>
        <label className="mt-4 block text-sm font-semibold">Delivery / pickup location<input required={fulfilment==="Delivery"} maxLength={180} value={deliveryLocation} onChange={(e)=>setDeliveryLocation(e.target.value)} className="mt-2 w-full rounded-xl border border-[#d5dbd3] px-4 py-3 font-normal outline-none focus:border-[#183b2b]" placeholder="Town, area and directions"/></label>
        <label className="mt-4 block text-sm font-semibold">Preferred date (optional)<input type="date" min={new Date().toISOString().slice(0,10)} value={requestedDate} onChange={(e)=>setRequestedDate(e.target.value)} className="mt-2 w-full rounded-xl border border-[#d5dbd3] px-4 py-3 font-normal"/></label>
        <label className="mt-4 block text-sm font-semibold">Additional instructions (optional)<textarea rows={3} maxLength={1000} value={notes} onChange={(e)=>setNotes(e.target.value)} className="mt-2 w-full rounded-xl border border-[#d5dbd3] px-4 py-3 font-normal outline-none focus:border-[#183b2b]" placeholder="Special requirements, access details or questions"/></label>
      </div>
      <div className="rounded-2xl bg-[#f3f4ee] p-5"><div className="flex items-center justify-between gap-4"><span className="text-sm text-[#647168]">Indicative subtotal</span><strong className="text-xl font-black">{estimate!==null ? new Intl.NumberFormat("en-GH",{style:"currency",currency:"GHS"}).format(estimate) : "To be quoted"}</strong></div><p className="mt-2 text-xs leading-5 text-[#758077]">This estimate uses the catalogue price only. The factory will confirm the final agreed price, availability and delivery charges before issuing a 50% deposit request.</p></div>
      {feedback && <div role="status" className={feedback.type==="success" ? "rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800" : "rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"}>{feedback.message}</div>}
      <button type="submit" disabled={submitting||!products.length||!productId||!customerName.trim()||!customerPhone.trim()||!Number.isSafeInteger(quantityValue)||quantityValue<=0||(fulfilment==="Delivery"&&!deliveryLocation.trim())} className="w-full rounded-full bg-[#183b2b] px-6 py-4 text-sm font-extrabold text-white transition hover:bg-[#24513b] disabled:cursor-not-allowed disabled:opacity-40">{submitting ? "Submitting request..." : "Submit order request →"}</button>
      <p className="text-center text-xs leading-5 text-[#758077]">No payment is taken at this stage. Your request does not reserve stock or create a confirmed ERP sale. If accepted, the factory will issue a quote with a 50% deposit requirement calculated on the full agreed total, including delivery.</p>
    </form>
  );
}

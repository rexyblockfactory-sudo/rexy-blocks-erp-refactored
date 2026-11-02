"use client";

import { FormEvent, useMemo, useState } from "react";

type Product = { id: string; name: string; category: string | null; size: string | null; price: number | string | null };

const WHATSAPP_NUMBER = "233547831902";

export default function OrderRequestForm({ products }: { products: Product[] }) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("100");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [fulfilment, setFulfilment] = useState<"Delivery" | "Factory pickup">("Delivery");
  const [requestedDate, setRequestedDate] = useState("");
  const [notes, setNotes] = useState("");

  const selectedProduct = products.find((product) => product.id === productId);
  const quantityValue = Number(quantity);
  const unitPrice = Number(selectedProduct?.price);
  const estimate = useMemo(() => {
    if (!Number.isSafeInteger(quantityValue) || quantityValue <= 0 || !Number.isFinite(unitPrice) || unitPrice <= 0) return null;
    return quantityValue * unitPrice;
  }, [quantityValue, unitPrice]);

  function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isSafeInteger(quantityValue) || quantityValue <= 0) return;

    const lines = [
      "Hello Rexy Blocks Factory. I would like to submit an ORDER REQUEST (not yet confirmed).",
      "",
      "CUSTOMER DETAILS",
      "Name: " + customerName.trim(),
      "Phone: " + customerPhone.trim(),
      "",
      "ORDER DETAILS",
      "Product: " + (selectedProduct?.name ?? "Product to be confirmed"),
      "Size / specification: " + (selectedProduct?.size ?? "Please confirm"),
      "Quantity: " + quantityValue.toLocaleString("en-GH") + " blocks",
      "Displayed unit price: " + (Number.isFinite(unitPrice) && unitPrice > 0 ? "GH₵" + unitPrice.toFixed(2) : "Please quote"),
      "Displayed subtotal: " + (estimate !== null ? "GH₵" + estimate.toFixed(2) : "To be quoted"),
      "Fulfilment: " + fulfilment,
      "Delivery / pickup location: " + (deliveryLocation.trim() || "To be discussed"),
      "Requested date: " + (requestedDate || "Flexible"),
      "Additional notes: " + (notes.trim() || "None"),
      "",
      "Please confirm current stock, final price, delivery charges and availability before treating this as a confirmed order.",
    ];
    const url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(lines.join("\n"));
    window.location.assign(url);
  }

  return (
    <form onSubmit={submitOrder} className="space-y-6 rounded-3xl border border-[#dfe3dc] bg-white p-6 shadow-sm sm:p-8">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#9a7026]">Customer details</p><div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Full name<input required maxLength={100} value={customerName} onChange={(e)=>setCustomerName(e.target.value)} className="mt-2 w-full rounded-xl border border-[#d5dbd3] px-4 py-3 font-normal outline-none focus:border-[#183b2b]" placeholder="Your name"/></label>
        <label className="block text-sm font-semibold">Contact number<input required type="tel" maxLength={30} value={customerPhone} onChange={(e)=>setCustomerPhone(e.target.value)} className="mt-2 w-full rounded-xl border border-[#d5dbd3] px-4 py-3 font-normal outline-none focus:border-[#183b2b]" placeholder="+233..."/></label>
      </div></div>
      <div className="border-t border-[#edf0eb] pt-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#9a7026]">What would you like to order?</p>
        {products.length ? <label className="mt-4 block text-sm font-semibold">Block product<select required value={productId} onChange={(e)=>setProductId(e.target.value)} className="mt-2 w-full rounded-xl border border-[#d5dbd3] bg-white px-4 py-3 font-normal">{products.map((p)=><option key={p.id} value={p.id}>{p.name}{p.size ? " · "+p.size : ""}</option>)}</select></label> : <p className="mt-4 rounded-xl bg-[#f5f6f1] p-4 text-sm text-[#647168]">The live catalogue is not available right now. Please use WhatsApp to describe the block size you need.</p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Quantity (blocks)<input required type="number" min="1" max="1000000" step="1" inputMode="numeric" value={quantity} onChange={(e)=>setQuantity(e.target.value)} className="mt-2 w-full rounded-xl border border-[#d5dbd3] px-4 py-3 font-normal outline-none focus:border-[#183b2b]"/></label>
        <label className="block text-sm font-semibold">Fulfilment<select value={fulfilment} onChange={(e)=>setFulfilment(e.target.value as "Delivery"|"Factory pickup")} className="mt-2 w-full rounded-xl border border-[#d5dbd3] bg-white px-4 py-3 font-normal"><option>Delivery</option><option>Factory pickup</option></select></label></div>
        <label className="mt-4 block text-sm font-semibold">Delivery / pickup location<input required={fulfilment==="Delivery"} maxLength={180} value={deliveryLocation} onChange={(e)=>setDeliveryLocation(e.target.value)} className="mt-2 w-full rounded-xl border border-[#d5dbd3] px-4 py-3 font-normal outline-none focus:border-[#183b2b]" placeholder="Town, area and directions"/></label>
        <label className="mt-4 block text-sm font-semibold">Preferred date (optional)<input type="date" value={requestedDate} onChange={(e)=>setRequestedDate(e.target.value)} className="mt-2 w-full rounded-xl border border-[#d5dbd3] px-4 py-3 font-normal"/></label>
        <label className="mt-4 block text-sm font-semibold">Additional instructions (optional)<textarea rows={3} maxLength={1000} value={notes} onChange={(e)=>setNotes(e.target.value)} className="mt-2 w-full rounded-xl border border-[#d5dbd3] px-4 py-3 font-normal outline-none focus:border-[#183b2b]" placeholder="Special requirements, access details or questions"/></label>
      </div>
      <div className="rounded-2xl bg-[#f3f4ee] p-5"><div className="flex items-center justify-between gap-4"><span className="text-sm text-[#647168]">Indicative subtotal</span><strong className="text-xl font-black">{estimate!==null ? new Intl.NumberFormat("en-GH",{style:"currency",currency:"GHS"}).format(estimate) : "To be quoted"}</strong></div><p className="mt-2 text-xs leading-5 text-[#758077]">This is an estimate using the current catalogue price only. Stock, final pricing, delivery charges and order acceptance must be confirmed by the factory.</p></div>
      <button type="submit" disabled={!customerName.trim()||!customerPhone.trim()||!Number.isSafeInteger(quantityValue)||quantityValue<=0||(fulfilment==="Delivery"&&!deliveryLocation.trim())} className="w-full rounded-full bg-[#183b2b] px-6 py-4 text-sm font-extrabold text-white transition hover:bg-[#24513b] disabled:cursor-not-allowed disabled:opacity-40">Send order request on WhatsApp →</button>
      <p className="text-center text-xs leading-5 text-[#758077]">Submitting opens WhatsApp with your request. It does not charge you, reserve stock or create a confirmed ERP sale.</p>
    </form>
  );
}
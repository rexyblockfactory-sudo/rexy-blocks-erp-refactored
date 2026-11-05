import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { depositPesewas, getTrackedOrder } from "@/lib/website-order-tracking";
import { paystackRequest, paystackSecret } from "@/lib/paystack-deposits";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const key = paystackSecret();
  const origin = process.env.WEBSITE_ORDER_CHECKOUT_ORIGIN;
  const sameOrigin = request.headers.get("sec-fetch-site") === "same-origin" || request.headers.get("origin") === origin;
  if (!key || !origin || !sameOrigin) {
    return new Response("Online checkout is unavailable.", { status: 403 });
  }
  const { token } = await params;
  const quote = new URL("/quote/" + encodeURIComponent(token), origin);
  const back = (notice: string) => {
    quote.searchParams.set("notice", notice);
    return NextResponse.redirect(quote, 303);
  };

  try {
    const order = await getTrackedOrder(token);
    if (!order) return new Response("Quote not found.", { status: 404 });
    const amount = depositPesewas(order);
    if (order.status !== "awaiting_deposit" || !Number.isSafeInteger(amount) || amount <= 0) return back("unavailable");

    const email = (await request.formData()).get("email");
    if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return back("email");

    const { error: reserveError } = await supabaseAdmin.from("website_order_checkouts")
      .upsert({ order_id: order.id, amount_pesewas: amount }, { onConflict: "order_id", ignoreDuplicates: true });
    if (reserveError) throw reserveError;
    const { data: checkout, error } = await supabaseAdmin.from("website_order_checkouts")
      .select("reference, amount_pesewas, checkout_url, status").eq("order_id", order.id).single();
    if (error) throw error;
    if (checkout.status !== "pending" || Number(checkout.amount_pesewas) !== amount) return back("unavailable");

    let checkoutUrl = checkout.checkout_url;
    if (!checkoutUrl) {
      const result = await paystackRequest("initialize", key, {
        email, amount: String(amount), currency: "GHS", reference: checkout.reference,
        callback_url: new URL("/quote/payment-return", origin).toString(),
        channels: ["mobile_money", "card"],
      });
      if (result.reference !== checkout.reference) throw new Error("Checkout reference mismatch.");
      checkoutUrl = result.authorization_url;
      if (typeof checkoutUrl !== "string" || new URL(checkoutUrl).origin !== "https://checkout.paystack.com") {
        throw new Error("Invalid checkout URL.");
      }
      const { error: saveError } = await supabaseAdmin.from("website_order_checkouts")
        .update({ checkout_url: checkoutUrl }).eq("reference", checkout.reference);
      if (saveError) throw saveError;
    }
    if (new URL(checkoutUrl).origin !== "https://checkout.paystack.com") throw new Error("Invalid checkout URL.");
    return NextResponse.redirect(checkoutUrl, { status: 303, headers: { "Referrer-Policy": "no-referrer", "Cache-Control": "no-store" } });
  } catch {
    return back("retry");
  }
}

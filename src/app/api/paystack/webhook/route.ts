import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { paystackRequest, paystackSecret } from "@/lib/paystack-deposits";
import { uuidPattern } from "@/lib/website-order-tracking";

export async function POST(request: Request) {
  const key = paystackSecret();
  if (!key) return new Response(null, { status: 503 });
  const signature = request.headers.get("x-paystack-signature") ?? "";
  if (!/^[a-f0-9]{128}$/.test(signature)) return new Response(null, { status: 401 });
  const raw = Buffer.from(await request.arrayBuffer());
  const expected = createHmac("sha512", key).update(raw).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) return new Response(null, { status: 401 });

  try {
    const event = JSON.parse(raw.toString("utf8"));
    const reference = event.data?.reference;
    if (event.event !== "charge.success" || typeof reference !== "string" || !uuidPattern.test(reference)) {
      return new Response(null, { status: 200 });
    }
    const { data: checkout, error } = await supabaseAdmin.from("website_order_checkouts")
      .select("status").eq("reference", reference).maybeSingle();
    if (error) throw error;
    if (!checkout || checkout.status !== "pending") return new Response(null, { status: 200 });

    const transaction = await paystackRequest("verify/" + reference, key);
    if (transaction.status !== "success" || transaction.reference !== reference ||
        transaction.currency !== "GHS" || !Number.isSafeInteger(transaction.amount) ||
        transaction.domain !== (key.startsWith("sk_live_") ? "live" : "test")) {
      throw new Error("Paystack transaction verification failed.");
    }
    const { error: recordError } = await supabaseAdmin.rpc("record_paystack_website_deposit", {
      p_reference: reference, p_amount_pesewas: transaction.amount,
    });
    if (recordError) throw recordError;
    return new Response(null, { status: 200 });
  } catch {
    return new Response(null, { status: 500 });
  }
}

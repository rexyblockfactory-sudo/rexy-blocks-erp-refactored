import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const uuidPattern = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

function sign(orderId: string) {
  const secret = process.env.WEBSITE_ORDER_TRACKING_SECRET;
  if (!secret || secret.length < 32) return null;
  return createHmac("sha256", secret).update("website-order:" + orderId).digest("hex");
}

export function trackingPath(orderId: string) {
  const signature = sign(orderId);
  return signature ? `/quote/${orderId}.${signature}` : null;
}

export async function getTrackedOrder(token: string) {
  const parts = token.split(".");
  const [id, signature] = parts;
  if (parts.length !== 2 || !uuidPattern.test(id) || !/^[a-f0-9]{64}$/.test(signature)) return null;
  const expected = sign(id);
  if (!expected || !timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"))) return null;

  const { data, error } = await supabaseAdmin.from("website_order_requests")
    .select("id, reference, status, product_name, product_size, quantity, fulfilment_type, quoted_subtotal, delivery_charge, additional_charges, quoted_total, deposit_required, amount_paid, balance_due")
    .eq("id", id).maybeSingle();
  if (error) throw new Error("Unable to load quote.", { cause: error });
  return data;
}

export function depositPesewas(order: NonNullable<Awaited<ReturnType<typeof getTrackedOrder>>>) {
  return Math.round((Number(order.deposit_required) - Number(order.amount_paid)) * 100);
}

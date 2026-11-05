import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{ orderId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await session.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profileError) return NextResponse.json({ error: "Unable to verify staff access." }, { status: 500 });
    if (!profile || !["admin", "manager", "accountant"].includes(profile.role)) {
      return NextResponse.json({ error: "Administrator, manager or accountant access required to verify payments." }, { status: 403 });
    }

    const { orderId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
    const body = await request.json();
    const amount = Number(body.amount);
    const paymentMethod = typeof body.payment_method === "string" ? body.payment_method.trim() : "";
    const reference = typeof body.reference === "string" ? body.reference.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000_000 ||
        paymentMethod.length < 2 || paymentMethod.length > 50 ||
        reference.length > 120 || notes.length > 500) {
      return NextResponse.json({ error: "Enter a valid payment amount, method and reference." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc("record_website_order_payment", {
      p_order_id: orderId,
      p_amount: amount,
      p_payment_method: paymentMethod,
      p_reference: reference || null,
      p_notes: notes || null,
      p_verified_by: user.id,
    });
    if (error) {
      console.error("Website order payment verification failed:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true, order: data });
  } catch (error) {
    console.error("Website order payment route error:", error);
    return NextResponse.json({ error: "Invalid payment verification request." }, { status: 400 });
  }
}

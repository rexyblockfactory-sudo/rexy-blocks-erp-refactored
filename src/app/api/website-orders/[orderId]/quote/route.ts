import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{ orderId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await session.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profileError) return NextResponse.json({ error: "Unable to verify staff access." }, { status: 500 });
    if (!profile || !["admin", "manager"].includes(profile.role)) {
      return NextResponse.json({ error: "Administrator or manager access required to issue a quote." }, { status: 403 });
    }

    const { orderId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
    const body = await request.json();
    const subtotal = Number(body.quoted_subtotal);
    const delivery = Number(body.delivery_charge);
    const additional = Number(body.additional_charges ?? 0);
    const depositPercent = Number(body.deposit_percent ?? 50);
    const staffNotes = typeof body.staff_notes === "string" ? body.staff_notes.trim() : "";

    if (![subtotal, delivery, additional, depositPercent].every(Number.isFinite) ||
        subtotal < 0 || delivery < 0 || additional < 0 ||
        depositPercent <= 0 || depositPercent > 100 ||
        staffNotes.length > 2000) {
      return NextResponse.json({ error: "Enter valid quote amounts and a deposit percentage between 0 and 100." }, { status: 400 });
    }

    const total = Math.round((subtotal + delivery + additional) * 100) / 100;
    const deposit = Math.round(total * depositPercent) / 100;
    if (total <= 0 || deposit <= 0) return NextResponse.json({ error: "The agreed total and deposit must be greater than zero." }, { status: 400 });

    const { data: order, error: orderError } = await supabaseAdmin
      .from("website_order_requests").select("id,status,amount_paid")
      .eq("id", orderId).maybeSingle();
    if (orderError) return NextResponse.json({ error: "Unable to load this order request." }, { status: 500 });
    if (!order) return NextResponse.json({ error: "Order request not found." }, { status: 404 });
    if (order.status !== "pending_review" || Number(order.amount_paid ?? 0) > 0) {
      return NextResponse.json({ error: "Only requests awaiting initial review can receive a new quote." }, { status: 409 });
    }

    const { error } = await supabaseAdmin.from("website_order_requests").update({
      quoted_subtotal: subtotal,
      delivery_charge: delivery,
      additional_charges: additional,
      quoted_total: total,
      deposit_percent: depositPercent,
      deposit_required: deposit,
      balance_due: total,
      status: "awaiting_deposit",
      staff_notes: staffNotes || null,
    }).eq("id", orderId);

    if (error) {
      console.error("Website order quote update failed:", error);
      return NextResponse.json({ error: "Unable to save the quote." }, { status: 500 });
    }
    return NextResponse.json({ success: true, quoted_total: total, deposit_required: deposit, balance_due: total - deposit });
  } catch (error) {
    console.error("Website order quote route error:", error);
    return NextResponse.json({ error: "Invalid quote request." }, { status: 400 });
  }
}

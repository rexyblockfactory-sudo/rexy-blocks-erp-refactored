import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface RouteContext { params: Promise<{ orderId: string }> }

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await session.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profileError) return NextResponse.json({ error: "Unable to verify staff access." }, { status: 500 });
    if (!profile || !["admin", "manager"].includes(profile.role)) {
      return NextResponse.json({ error: "Administrator or manager access required to accept an order." }, { status: 403 });
    }

    const { orderId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });

    const { data: order, error: readError } = await supabaseAdmin
      .from("website_order_requests")
      .select("id,status,deposit_required,amount_paid,deposit_verified_at")
      .eq("id", orderId).maybeSingle();
    if (readError) return NextResponse.json({ error: "Unable to load order request." }, { status: 500 });
    if (!order) return NextResponse.json({ error: "Order request not found." }, { status: 404 });
    if (order.status !== "deposit_received" || !order.deposit_verified_at ||
        Number(order.deposit_required ?? 0) <= 0 ||
        Number(order.amount_paid ?? 0) < Number(order.deposit_required)) {
      return NextResponse.json({ error: "The required deposit must be verified before accepting this order." }, { status: 409 });
    }

    const { data, error } = await supabaseAdmin
      .from("website_order_requests")
      .update({ status: "confirmed", accepted_at: new Date().toISOString(), accepted_by: user.id })
      .eq("id", orderId).eq("status", "deposit_received")
      .select("id,status,accepted_at")
      .maybeSingle();
    if (error) {
      console.error("Website order acceptance failed:", error);
      return NextResponse.json({ error: "Unable to accept this order." }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "The order changed before it could be accepted. Refresh and review it again." }, { status: 409 });
    return NextResponse.json({ success: true, order: data });
  } catch (error) {
    console.error("Website order acceptance route error:", error);
    return NextResponse.json({ error: "Unable to accept this order." }, { status: 500 });
  }
}

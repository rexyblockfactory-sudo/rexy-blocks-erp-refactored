import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const session = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await session.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profileError) return NextResponse.json({ error: "Unable to verify staff access." }, { status: 500 });
    if (!profile || !["admin", "manager", "operator", "accountant"].includes(profile.role)) {
      return NextResponse.json({ error: "You do not have permission to view website orders." }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("website_order_requests")
      .select("id,reference,customer_name,customer_phone,product_id,product_name,product_size,quantity,fulfilment_type,fulfilment_location,requested_date,customer_notes,status,quoted_subtotal,delivery_charge,additional_charges,quoted_total,deposit_percent,deposit_required,amount_paid,balance_due,staff_notes,deposit_verified_at,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(250);
    if (error) {
      console.error("Website order list failed:", error);
      return NextResponse.json({ error: "Unable to load website order requests." }, { status: 500 });
    }
    return NextResponse.json({ orders: data ?? [] });
  } catch (error) {
    console.error("Website order list route error:", error);
    return NextResponse.json({ error: "Unable to load website order requests." }, { status: 500 });
  }
}

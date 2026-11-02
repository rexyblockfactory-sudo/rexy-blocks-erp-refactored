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
      return NextResponse.json({ error: "Administrator or manager access required to convert an order." }, { status: 403 });
    }

    const { orderId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });

    const { data: sale, error } = await supabaseAdmin.rpc("convert_website_order_to_sale", {
      p_order_id: orderId,
      p_converted_by: user.id,
    });
    if (error) {
      console.error("Website order conversion failed:", error);
      return NextResponse.json({ error: error.message || "Unable to convert this order." }, { status: 409 });
    }
    if (!sale?.id) return NextResponse.json({ error: "Conversion returned no ERP sale record." }, { status: 500 });

    const { data: invoice } = await supabaseAdmin
      .from("invoices").select("invoice_number").eq("sale_id", sale.id).maybeSingle();

    return NextResponse.json({ success: true, sale, invoice_number: invoice?.invoice_number ?? null });
  } catch (error) {
    console.error("Website order conversion route error:", error);
    return NextResponse.json({ error: "Unable to convert this order." }, { status: 500 });
  }
}

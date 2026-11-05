import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { trackingPath } from "@/lib/website-order-tracking";
import { paystackSecret } from "@/lib/paystack-deposits";

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
      .select("id,reference,customer_name,customer_phone,product_id,product_name,product_size,quantity,fulfilment_type,fulfilment_location,requested_date,customer_notes,status,quoted_subtotal,delivery_charge,additional_charges,quoted_total,deposit_percent,deposit_required,amount_paid,balance_due,staff_notes,deposit_verified_at,created_at,updated_at,sale_id")
      .order("created_at", { ascending: false })
      .limit(250);
    if (error) {
      console.error("Website order list failed:", error);
      return NextResponse.json({ error: "Unable to load website order requests." }, { status: 500 });
    }
    type WebsiteOrderRow = Record<string, unknown> & { id: string; sale_id: string | null; amount_paid: number; balance_due: number; invoice_number?: string | null };
    const orders = (data ?? []) as WebsiteOrderRow[];
    const saleIds = orders.map((order) => order.sale_id).filter((id): id is string => Boolean(id));
    if (saleIds.length) {
      const [{ data: sales }, { data: invoices }] = await Promise.all([
        supabaseAdmin.from("sales").select("id,amount_paid,balance_due").in("id", saleIds),
        supabaseAdmin.from("invoices").select("sale_id,invoice_number").in("sale_id", saleIds),
      ]);
      const salesById = new Map((sales ?? []).map((sale) => [sale.id, sale]));
      const invoicesBySaleId = new Map((invoices ?? []).map((invoice) => [invoice.sale_id, invoice.invoice_number]));
      for (const order of orders) {
        if (!order.sale_id) continue;
        const sale = salesById.get(order.sale_id);
        if (sale) {
          order.amount_paid = sale.amount_paid;
          order.balance_due = sale.balance_due;
        }
        order.invoice_number = invoicesBySaleId.get(order.sale_id) ?? null;
      }
    }
    const reviews = new Map<string, string>();
    if (paystackSecret() && orders.length) {
      const { data, error } = await supabaseAdmin.from("website_order_checkouts")
        .select("order_id, reference").eq("status", "needs_review").in("order_id", orders.map(order => order.id));
      if (error) console.error("Unable to load Paystack reconciliation flags.");
      for (const checkout of data ?? []) reviews.set(checkout.order_id, checkout.reference);
    }
    return NextResponse.json({
      orders: orders.map(order => ({
        ...order,
        tracking_path: trackingPath(order.id),
        paystack_review_reference: reviews.get(order.id),
      })),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Website order list route error:", error);
    return NextResponse.json({ error: "Unable to load website order requests." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const customerName = typeof body.customer_name === "string" ? body.customer_name.trim() : "";
    const customerPhone = typeof body.customer_phone === "string" ? body.customer_phone.trim() : "";
    const productId = typeof body.product_id === "string" ? body.product_id : "";
    const quantity = Number(body.quantity);
    const fulfilmentType = body.fulfilment_type;
    const fulfilmentLocation = typeof body.fulfilment_location === "string" ? body.fulfilment_location.trim() : "";
    const requestedDate = typeof body.requested_date === "string" && body.requested_date ? body.requested_date : null;
    const customerNotes = typeof body.customer_notes === "string" ? body.customer_notes.trim() : "";

    if (customerName.length < 2 || customerName.length > 100) return NextResponse.json({ error: "Enter a valid customer name." }, { status: 400 });
    if (customerPhone.length < 7 || customerPhone.length > 30) return NextResponse.json({ error: "Enter a valid contact number." }, { status: 400 });
    if (!productId || !/^[0-9a-f-]{36}$/i.test(productId)) return NextResponse.json({ error: "Select a valid catalogue product." }, { status: 400 });
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1_000_000) return NextResponse.json({ error: "Quantity must be a whole number between 1 and 1,000,000." }, { status: 400 });
    if (fulfilmentType !== "Delivery" && fulfilmentType !== "Factory pickup") return NextResponse.json({ error: "Select delivery or factory pickup." }, { status: 400 });
    if (fulfilmentType === "Delivery" && !fulfilmentLocation) return NextResponse.json({ error: "A delivery location is required." }, { status: 400 });
    if (fulfilmentLocation.length > 180 || customerNotes.length > 1000) return NextResponse.json({ error: "Some order details exceed the allowed length." }, { status: 400 });
    if (requestedDate && (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || Number.isNaN(Date.parse(requestedDate)))) return NextResponse.json({ error: "Enter a valid requested date." }, { status: 400 });

    // Always use the public anon role; a staff browser session must not change the public INSERT permissions.
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    );
    const { data: product, error: productError } = await db
      .from("products").select("id,name,size").eq("id", productId).maybeSingle();
    if (productError || !product) return NextResponse.json({ error: "The selected product is unavailable. Please refresh the catalogue." }, { status: 400 });

    const { error } = await db.from("website_order_requests").insert({
      customer_name: customerName,
      customer_phone: customerPhone,
      product_id: product.id,
      product_name: product.name,
      product_size: product.size,
      quantity,
      fulfilment_type: fulfilmentType,
      fulfilment_location: fulfilmentLocation || null,
      requested_date: requestedDate,
      customer_notes: customerNotes || null,
    });
    if (error) {
      console.error("Website order submission failed:", error);
      return NextResponse.json({ error: "We could not save your request. Please try again or contact the factory on WhatsApp." }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: "Your request has been received for factory review." }, { status: 201 });
  } catch (error) {
    console.error("Website order route error:", error);
    return NextResponse.json({ error: "Invalid request. Please check your details and try again." }, { status: 400 });
  }
}

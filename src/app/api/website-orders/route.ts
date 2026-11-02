import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_QUANTITY = 1_000_000;

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

    if (customerName.length < 2 || customerName.length > 100) {
      return NextResponse.json({ error: "Enter a valid customer name." }, { status: 400 });
    }
    if (customerPhone.length < 7 || customerPhone.length > 30) {
      return NextResponse.json({ error: "Enter a valid contact number." }, { status: 400 });
    }
    if (!productId || !/^[0-9a-f-]{36}$/i.test(productId)) {
      return NextResponse.json({ error: "Select a valid catalogue product." }, { status: 400 });
    }
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return NextResponse.json({ error: "Quantity must be a whole number between 1 and 1,000,000." }, { status: 400 });
    }
    if (fulfilmentType !== "Delivery" && fulfilmentType !== "Factory pickup") {
      return NextResponse.json({ error: "Select delivery or factory pickup." }, { status: 400 });
    }
    if (fulfilmentType === "Delivery" && !fulfilmentLocation) {
      return NextResponse.json({ error: "A delivery location is required." }, { status: 400 });
    }
    if (fulfilmentLocation.length > 180 || customerNotes.length > 1000) {
      return NextResponse.json({ error: "Some order details exceed the allowed length." }, { status: 400 });
    }
    if (requestedDate && (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || Number.isNaN(Date.parse(requestedDate)))) {
      return NextResponse.json({ error: "Enter a valid requested date." }, { status: 400 });
    }

    const db = await createSupabaseServerClient();
    const { data: product, error: productError } = await db
      .from("products")
      .select("id,name,size")
      .eq("id", productId)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json({ error: "The selected product is unavailable. Please refresh the catalogue." }, { status: 400 });
    }

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

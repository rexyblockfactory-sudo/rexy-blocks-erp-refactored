import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  badRequest, parseEditableProperty, propertyStaff, PROPERTY_UUID, verifySameOrigin,
} from "@/lib/property-admin";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  if (!await propertyStaff()) return badRequest("Authorised property staff access required.", 403);
  const { id } = await context.params;
  if (!PROPERTY_UUID.test(id)) return badRequest("Invalid listing ID.");
  const { data, error } = await supabaseAdmin.from("property_listings")
    .select("id,slug,market,status,title,description,city,region,neighborhood,construction_status,price_ghs,bedrooms,bathrooms,max_guests,amenities,photo_urls,verification_notes,verified_at,verified_by,published_at,updated_at")
    .eq("id", id).maybeSingle();
  if (error) return badRequest("Unable to load property.", 503);
  if (!data) return badRequest("Property not found.", 404);
  return NextResponse.json({ listing: data }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request, context: Context) {
  try {
    const staff = await propertyStaff();
    if (!staff) return badRequest("Authorised property staff access required.", 403);
    if (!verifySameOrigin(request)) return badRequest("Invalid origin.", 403);
    const { id } = await context.params;
    if (!PROPERTY_UUID.test(id)) return badRequest("Invalid listing ID.");
    const body = await request.json();
    const { data: current, error: readError } = await supabaseAdmin
      .from("property_listings").select("id,status,updated_at").eq("id", id).maybeSingle();
    if (readError) return badRequest("Unable to load property.", 503);
    if (!current) return badRequest("Property not found.", 404);

    const expected = typeof body.expected_updated_at === "string" ? body.expected_updated_at : "";
    if (!expected || expected !== current.updated_at) {
      return badRequest("Property changed since this page loaded. Refresh before editing.", 409);
    }

    if (body.archive === true) {
      if (staff.role !== "admin") return badRequest("Only administrators may archive property listings.", 403);
      const { data, error } = await supabaseAdmin.from("property_listings")
        .update({
          status: "archived", verified_at: null, verified_by: null,
          verification_notes: null, published_at: null, updated_at: new Date().toISOString(),
        })
        .eq("id", id).eq("updated_at", expected).select("id").maybeSingle();
      if (error) return badRequest("Unable to archive property.", 503);
      if (!data) return badRequest("Property changed. Refresh and retry.", 409);
      return NextResponse.json({ success: true });
    }

    if (current.status === "archived") return badRequest("Archived properties are read-only.", 409);
    if (current.status === "published" && staff.role !== "admin") {
      return badRequest("Only administrators may edit published listings.", 403);
    }
    const input = parseEditableProperty(body, id);
    if (!input) return badRequest("Invalid property details. Check all fields.");
    // Any content change revokes verification and unpublishes first.
    const { data, error } = await supabaseAdmin.from("property_listings").update({
      ...input, status: "draft", verified_at: null, verified_by: null,
      verification_notes: null, published_at: null, updated_at: new Date().toISOString(),
    }).eq("id", id).eq("updated_at", expected).select("id").maybeSingle();
    if (error) {
      console.error("Update property draft error:", error.message);
      return badRequest("Could not save changes.", error.code === "23505" ? 409 : 503);
    }
    if (!data) return badRequest("Property changed. Refresh and retry.", 409);
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return badRequest("Unable to update property.", 400);
  }
}

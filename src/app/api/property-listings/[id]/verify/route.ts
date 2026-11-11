import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { badRequest, propertyStaff, PROPERTY_UUID, validatePhotoUrls, verifySameOrigin } from "@/lib/property-admin";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const staff = await propertyStaff();
    if (!staff || staff.role !== "admin") return badRequest("Administrator access required for verification.", 403);
    if (!verifySameOrigin(request)) return badRequest("Invalid origin.", 403);
    const { id } = await context.params;
    if (!PROPERTY_UUID.test(id)) return badRequest("Invalid listing ID.");
    const body = await request.json();
    const notes = typeof body.verification_notes === "string" ? body.verification_notes.trim() : "";
    if (body.ownership_checked !== true || body.marketing_authority_checked !== true ||
        body.photo_rights_checked !== true || notes.length < 30 || notes.length > 3000) {
      return badRequest("Confirm ownership evidence, authority to market, photo rights, and at least 30 characters of verification notes.");
    }
    const { data: property, error: readError } = await supabaseAdmin.from("property_listings")
      .select("id,status,market,title,city,region,description,price_ghs,bedrooms,bathrooms,max_guests,photo_urls,updated_at")
      .eq("id", id).maybeSingle();
    if (readError) return badRequest("Unable to load property.", 503);
    if (!property) return badRequest("Property not found.", 404);
    if (property.status !== "draft") return badRequest("Only draft properties may be verified.", 409);
    if (!property.title || !property.description || !property.city || !property.region ||
        property.price_ghs == null || Number(property.price_ghs) <= 0 ||
        property.bedrooms == null || property.bathrooms == null ||
        (property.market === "stay" && (!property.max_guests || property.max_guests < 1)) ||
        !Array.isArray(property.photo_urls) || property.photo_urls.length === 0 ||
        validatePhotoUrls(property.photo_urls) === null) {
      return badRequest("Complete the asking price, description, bedrooms, bathrooms, and upload authorised photos before verification.");
    }
    const { data, error } = await supabaseAdmin.from("property_listings").update({
      verified_by: staff.userId,
      verified_at: new Date().toISOString(),
      verification_notes: notes,
      updated_at: new Date().toISOString(),
    }).eq("id", id).eq("status", "draft").eq("updated_at", property.updated_at)
      .select("id").maybeSingle();
    if (error) return badRequest("Verification failed.", 503);
    if (!data) return badRequest("The listing changed during verification. Refresh first.", 409);
    return NextResponse.json({ verified: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return badRequest("Could not verify listing.", 400);
  }
}

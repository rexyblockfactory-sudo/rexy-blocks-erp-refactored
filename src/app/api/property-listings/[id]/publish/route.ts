import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { badRequest, propertyStaff, PROPERTY_UUID, verifySameOrigin } from "@/lib/property-admin";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const staff = await propertyStaff();
    if (!staff || staff.role !== "admin") return badRequest("Administrator access required to publish properties.", 403);
    if (!verifySameOrigin(request)) return badRequest("Invalid origin.", 403);
    const { id } = await context.params;
    if (!PROPERTY_UUID.test(id)) return badRequest("Invalid listing ID.");
    const { data: current, error: readError } = await supabaseAdmin.from("property_listings")
      .select("id,status,verified_at,verified_by,verification_notes,price_ghs,photo_urls,updated_at").eq("id", id).maybeSingle();
    if (readError) return badRequest("Unable to load property.", 503);
    if (!current) return badRequest("Property not found.", 404);
    if (current.status !== "draft" || !current.verified_at || !current.verified_by ||
        !current.verification_notes || !current.price_ghs || !current.photo_urls?.length) {
      return badRequest("Only a fully verified draft with an asking price and photos can be published.", 409);
    }
    const { data, error } = await supabaseAdmin.from("property_listings").update({
      status: "published", published_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", id).eq("status", "draft").eq("updated_at", current.updated_at)
      .select("id").maybeSingle();
    if (error) return badRequest("Unable to publish listing.", 503);
    if (!data) return badRequest("Listing changed during publication. Refresh before trying again.", 409);
    return NextResponse.json({ published: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return badRequest("Could not publish listing.", 400);
  }
}

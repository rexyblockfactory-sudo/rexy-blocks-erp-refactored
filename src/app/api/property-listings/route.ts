import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  badRequest, parseEditableProperty, propertyStaff, verifySameOrigin,
} from "@/lib/property-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const staff = await propertyStaff();
    if (!staff) return badRequest("Authorised property staff access required.", 403);
    const { data, error } = await supabaseAdmin.from("property_listings")
      .select("id,slug,market,status,title,description,city,region,neighborhood,map_url,construction_status,price_ghs,bedrooms,bathrooms,max_guests,amenities,photo_urls,verification_notes,verified_at,verified_by,published_at,created_at,updated_at")
      .order("created_at", { ascending: false }).limit(250);
    if (error) {
      console.error("Property admin list error:", error.message);
      return badRequest("Property database is not yet connected or could not be loaded.", 503);
    }
    return NextResponse.json({ listings: data ?? [], role: staff.role }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return badRequest("Could not load property listings.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const staff = await propertyStaff();
    if (!staff) return badRequest("Authorised property staff access required.", 403);
    if (!verifySameOrigin(request)) return badRequest("Invalid origin.", 403);
    const body = await request.json();
    const input = parseEditableProperty(body);
    if (!input) return badRequest("Invalid property details. Check the title, slug, market, location, photos and numeric fields.");

    // Clients cannot set status, verification, payment, ownership or other privileged fields.
    const { data, error } = await supabaseAdmin.from("property_listings")
      .insert({ ...input, status: "draft" })
      .select("id,slug,status").single();
    if (error) {
      console.error("Create property draft error:", error.message);
      return badRequest(error.code === "23505" ? "That property URL is already in use." : "Unable to create draft. Confirm that the property database is installed.", error.code === "23505" ? 409 : 503);
    }
    return NextResponse.json({ listing: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return badRequest("Unable to create property draft.", 400);
  }
}

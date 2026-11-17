import { NextResponse } from "next/server";
import { badRequest, propertyStaff } from "@/lib/property-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  if (!await propertyStaff()) return badRequest("Authorised property staff access required.",403);
  const params=new URL(request.url).searchParams;
  const status=params.get("status") ?? "pending";
  if (!["pending","changes_requested","rejected","draft_created"].includes(status)) return badRequest("Invalid review filter.");
  const offset=Number(params.get("offset") ?? 0);
  if (!Number.isSafeInteger(offset) || offset<0 || offset>100_000) return badRequest("Invalid page.");
  const {data,error}=await supabaseAdmin.from("property_submissions")
    .select("id,reference,contact_name,contact_phone,property_data,photo_paths,status,review_notes,listing_id,created_at,updated_at")
    .eq("status",status).order("created_at",{ascending:false}).order("id").range(offset,offset+20);
  if (error) return badRequest("Could not load property submissions.",503);
  const items=data.slice(0,20).map(({photo_paths,...item})=>({...item,photo_count:photo_paths.length}));
  return NextResponse.json({items,has_more:data.length>20},{headers:{"Cache-Control":"private, no-store"}});
}

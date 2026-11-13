import { NextResponse } from "next/server";
import { badRequest, propertyStaff, PROPERTY_UUID, verifySameOrigin } from "@/lib/property-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Context={params:Promise<{id:string}>};
export async function PATCH(request:Request,context:Context) {
  const staff=await propertyStaff();
  if (!staff) return badRequest("Authorised property staff access required.",403);
  if (!verifySameOrigin(request)) return badRequest("Invalid request origin.",403);
  const {id}=await context.params;
  if (!PROPERTY_UUID.test(id)) return badRequest("Invalid submission.");
  let body;
  try { body=await request.json(); } catch { return badRequest("Invalid review action."); }
  if (body?.action==="create_draft") {
    const {data,error}=await supabaseAdmin.rpc("create_listing_from_property_submission",{
      p_submission_id:id,p_reviewer_id:staff.userId,
    });
    if (error || typeof data!=="string") return badRequest("Could not create a draft. Check the submission status and try again.",error?.code==="22023"?409:503);
    return NextResponse.json({listing_id:data},{headers:{"Cache-Control":"private, no-store"}});
  }
  if (!["changes_requested","rejected"].includes(body?.action)) return badRequest("Invalid review action.");
  if (body.action==="rejected" && staff.role!=="admin") return badRequest("Only an administrator can reject a submission.",403);
  const notes=typeof body.notes==="string"?body.notes.trim():"";
  if (notes.length<5 || notes.length>1500 || notes.includes("\u0000")) return badRequest("Add a private review note of 5–1,500 characters.");
  if (typeof body.expected_updated_at!=="string" || !Number.isFinite(Date.parse(body.expected_updated_at))) return badRequest("Refresh the submission first.");
  const {data,error}=await supabaseAdmin.from("property_submissions")
    .update({status:body.action,review_notes:notes,reviewed_by:staff.userId,updated_at:new Date().toISOString()})
    .eq("id",id).eq("updated_at",body.expected_updated_at).in("status",["pending","changes_requested"]).is("listing_id",null)
    .select("id").maybeSingle();
  if (error) return badRequest("Could not save the review.",503);
  if (!data) return badRequest("The submission changed. Refresh and try again.",409);
  return NextResponse.json({saved:true},{headers:{"Cache-Control":"private, no-store"}});
}

import { propertyStaff, PROPERTY_UUID } from "@/lib/property-admin";
import { propertyPhotoIndex, serveSubmissionPhoto } from "@/lib/property-submission-media";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(_request:Request,{params}:{params:Promise<{id:string;index:string}>}) {
  const {id,index}=await params;
  const i=propertyPhotoIndex(index);
  if (!PROPERTY_UUID.test(id) || i===null) return new Response(null,{status:404});
  const {data:listing}=await supabaseAdmin.from("property_listings")
    .select("id,status,photo_urls,verified_at,verified_by,published_at").eq("id",id).maybeSingle();
  if (!listing?.photo_urls.includes("/api/property-listing-media/"+id+"/"+i)) return new Response(null,{status:404});
  const published=listing.status==="published" && listing.verified_at && listing.verified_by && listing.published_at;
  if (!published && (listing.status!=="draft" || !await propertyStaff())) return new Response(null,{status:404});
  const {data:submission}=await supabaseAdmin.from("property_submissions")
    .select("id,photo_paths").eq("listing_id",id).eq("status","draft_created").maybeSingle();
  if (!submission) return new Response(null,{status:404});
  return serveSubmissionPhoto(submission.id,submission.photo_paths,i);
}

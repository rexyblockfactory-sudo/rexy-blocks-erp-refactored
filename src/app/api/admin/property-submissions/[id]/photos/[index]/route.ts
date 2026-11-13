import { propertyStaff, PROPERTY_UUID } from "@/lib/property-admin";
import { propertyPhotoIndex, serveSubmissionPhoto } from "@/lib/property-submission-media";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(_request:Request,{params}:{params:Promise<{id:string;index:string}>}) {
  if (!await propertyStaff()) return new Response(null,{status:403});
  const {id,index}=await params;
  const i=propertyPhotoIndex(index);
  if (!PROPERTY_UUID.test(id) || i===null) return new Response(null,{status:404});
  const {data,error}=await supabaseAdmin.from("property_submissions").select("photo_paths").eq("id",id).maybeSingle();
  if (error || !data) return new Response(null,{status:404});
  return serveSubmissionPhoto(id,data.photo_paths,i);
}

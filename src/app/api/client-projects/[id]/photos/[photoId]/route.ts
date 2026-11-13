import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProjectStaff, isProjectId, projectError, validProjectOrigin } from "@/lib/project-admin";

type Context={params:Promise<{id:string;photoId:string}>};
export async function DELETE(request:Request,context:Context){
  try{
    const staff=await getProjectStaff();
    if(!staff||staff.role!=="admin")return projectError("Administrator access required.",403);
    if(!validProjectOrigin(request))return projectError("Invalid request origin.",403);
    const {id,photoId}=await context.params;
    if(!isProjectId(id)||!isProjectId(photoId))return projectError("Invalid photo reference.");
    const {data:photo,error:readError}=await supabaseAdmin.from("client_project_photos")
      .select("id,storage_path").eq("id",photoId).eq("project_id",id).maybeSingle();
    if(readError)return projectError("Unable to load photo.",503);
    if(!photo)return projectError("Photo not found.",404);
    if(!photo.storage_path.startsWith(id+"/"))return projectError("Invalid photo location.",409);
    const {error:storageError}=await supabaseAdmin.storage.from("client-project-media").remove([photo.storage_path]);
    if(storageError)return projectError("Photo could not be removed from private storage.",503);
    const {error}=await supabaseAdmin.from("client_project_photos")
      .delete().eq("project_id",id).eq("id",photoId);
    if(error)return projectError("Photo file was removed, but its record requires administrator review.",503);
    return NextResponse.json({removed:true},{headers:{"Cache-Control":"no-store"}});
  }catch{return projectError("Unable to remove photo.",400)}
}

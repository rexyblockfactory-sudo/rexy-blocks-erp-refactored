import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProjectStaff, isProjectId, projectError, validProjectOrigin } from "@/lib/project-admin";

type Context={params:Promise<{id:string;updateId:string}>};
export async function PATCH(request:Request, context:Context){
  try{
    const staff=await getProjectStaff();
    if(!staff||staff.role!=="admin")return projectError("Administrator access required.",403);
    if(!validProjectOrigin(request))return projectError("Invalid request origin.",403);
    const {id,updateId}=await context.params;
    if(!isProjectId(id)||!isProjectId(updateId))return projectError("Invalid progress report.");
    const body=await request.json();
    if(typeof body.is_visible!=="boolean")return projectError("Visibility must be a boolean.");
    const {data,error}=await supabaseAdmin.from("client_project_updates")
      .update({is_visible:body.is_visible}).eq("project_id",id).eq("id",updateId).select("id").maybeSingle();
    if(error)return projectError("Could not change progress visibility.",503);
    if(!data)return projectError("Progress report not found.",404);
    return NextResponse.json({success:true});
  }catch{return projectError("Unable to edit progress report.",400)}
}

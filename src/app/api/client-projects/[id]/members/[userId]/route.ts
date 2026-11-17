import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProjectStaff, isProjectId, projectError, validProjectOrigin } from "@/lib/project-admin";

type Context = { params: Promise<{ id: string; userId: string }> };
export async function DELETE(request: Request, context: Context) {
  try {
    const staff=await getProjectStaff();
    if(!staff||staff.role!=="admin")return projectError("Administrator access required.",403);
    if(!validProjectOrigin(request))return projectError("Invalid request origin.",403);
    const {id,userId}=await context.params;
    if(!isProjectId(id)||!isProjectId(userId))return projectError("Invalid membership identifier.");
    const {data,error}=await supabaseAdmin.from("client_project_members")
      .delete().eq("project_id",id).eq("user_id",userId).select("project_id").maybeSingle();
    if(error)return projectError("Owner access could not be revoked.",503);
    if(!data)return projectError("Membership not found.",404);
    return NextResponse.json({revoked:true},{headers:{"Cache-Control":"no-store"}});
  }catch{return projectError("Unable to revoke project access.",400)}
}

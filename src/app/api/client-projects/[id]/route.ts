import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProjectStaff, isProjectId, parseProject, projectError, validProjectOrigin } from "@/lib/project-admin";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    if (!(await getProjectStaff())) return projectError("Staff authorisation required.", 403);
    const { id } = await context.params;
    if (!isProjectId(id)) return projectError("Invalid project ID.");
    const [project, updates, milestones, members, photos] = await Promise.all([
      supabaseAdmin.from("client_projects")
        .select("id,name,location,description,status,progress_percent,start_date,target_date,created_at,updated_at")
        .eq("id", id).maybeSingle(),
      supabaseAdmin.from("client_project_updates")
        .select("id,heading,details,progress_percent,created_at,is_visible")
        .eq("project_id", id).order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("client_project_milestones")
        .select("id,title,status,due_date,sort_order").eq("project_id", id).order("sort_order").limit(100),
      supabaseAdmin.from("client_project_members").select("user_id,added_at").eq("project_id", id).limit(40),
      supabaseAdmin.from("client_project_photos").select("id,caption,storage_path,created_at")
        .eq("project_id", id).order("created_at", { ascending: false }).limit(100),
    ]);
    if (!project.data) return projectError("Project not found.", 404);
    if (project.error || updates.error || milestones.error || members.error || photos.error) {
      return projectError("Some project details could not be loaded.", 503);
    }
    const signedPhotos = await Promise.all((photos.data ?? []).map(async (p) => {
      const { data } = await supabaseAdmin.storage.from("client-project-media").createSignedUrl(p.storage_path, 300);
      return data?.signedUrl ? { id: p.id, caption: p.caption, created_at: p.created_at, url: data.signedUrl } : null;
    }));
    // Membership IDs are shown to staff only; no service-role credential is sent.
    return NextResponse.json({
      project: project.data, updates: updates.data ?? [], milestones: milestones.data ?? [],
      members: members.data ?? [], photos: signedPhotos.filter(Boolean),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return projectError("Unable to load project.", 503); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    if (!(await getProjectStaff())) return projectError("Staff authorisation required.", 403);
    if (!validProjectOrigin(request)) return projectError("Invalid request origin.", 403);
    const { id } = await context.params;
    if (!isProjectId(id)) return projectError("Invalid project ID.");
    const input = parseProject(await request.json());
    if (!input) return projectError("Invalid project details.");
    const { data, error } = await supabaseAdmin.from("client_projects").update({
      ...input, updated_at: new Date().toISOString(),
    }).eq("id", id).select("id,updated_at").maybeSingle();
    if (error) return projectError("Project update failed.", 503);
    if (!data) return projectError("Project not found.", 404);
    return NextResponse.json({ project: data }, { headers: { "Cache-Control": "no-store" } });
  } catch { return projectError("Unable to update project.", 400); }
}

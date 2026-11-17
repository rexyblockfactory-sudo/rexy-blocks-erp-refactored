import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProjectStaff, isProjectId, parseMilestone, projectError, validProjectOrigin } from "@/lib/project-admin";

type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) {
  try {
    if (!(await getProjectStaff())) return projectError("Staff authorisation required.", 403);
    if (!validProjectOrigin(request)) return projectError("Invalid request origin.", 403);
    const { id } = await context.params;
    if (!isProjectId(id)) return projectError("Invalid project ID.");
    const input = parseMilestone(await request.json());
    if (!input) return projectError("Milestone title, stage or date is invalid.");
    const { data, error } = await supabaseAdmin.from("client_project_milestones")
      .insert({ ...input, project_id: id }).select("id").single();
    if (error) return projectError("Milestone could not be created.", 503);
    return NextResponse.json({ milestone: data }, { status: 201 });
  } catch { return projectError("Unable to add milestone.", 400); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    if (!(await getProjectStaff())) return projectError("Staff authorisation required.", 403);
    if (!validProjectOrigin(request)) return projectError("Invalid request origin.", 403);
    const { id } = await context.params;
    if (!isProjectId(id)) return projectError("Invalid project ID.");
    const body = await request.json();
    if (!isProjectId(body?.milestone_id)) return projectError("Invalid milestone.");
    const input = parseMilestone(body);
    if (!input) return projectError("Milestone details are invalid.");
    const { data, error } = await supabaseAdmin.from("client_project_milestones")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("project_id", id).eq("id", body.milestone_id).select("id").maybeSingle();
    if (error) return projectError("Milestone update failed.", 503);
    if (!data) return projectError("Milestone not found.", 404);
    return NextResponse.json({ success: true });
  } catch { return projectError("Unable to edit milestone.", 400); }
}

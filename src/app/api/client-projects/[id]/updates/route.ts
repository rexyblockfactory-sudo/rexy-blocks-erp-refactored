import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProjectStaff, isProjectId, parseUpdate, projectError, validProjectOrigin } from "@/lib/project-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    if (!(await getProjectStaff())) return projectError("Staff authorisation required.", 403);
    if (!validProjectOrigin(request)) return projectError("Invalid request origin.", 403);
    const { id } = await context.params;
    if (!isProjectId(id)) return projectError("Invalid project ID.");
    const input = parseUpdate(await request.json());
    if (!input) return projectError("Update heading, description and completion percentage are required.");
    const session = await createSupabaseServerClient();
    const { data: { user } } = await session.auth.getUser();
    if (!user) return projectError("Sign in required.", 401);

    const { data, error } = await supabaseAdmin.rpc("record_client_project_progress", {
      p_project_id: id, p_heading: input.heading,
      p_details: input.details, p_progress_percent: input.progress_percent, p_created_by: user.id,
    });
    if (error) {
      console.error("Record project progress failed:", error.message);
      return projectError("Project update could not be saved.", 503);
    }
    return NextResponse.json({ update_id: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch { return projectError("Unable to record progress.", 400); }
}

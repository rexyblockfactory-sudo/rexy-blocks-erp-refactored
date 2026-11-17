import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProjectStaff, parseProject, projectError, validProjectOrigin } from "@/lib/project-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!(await getProjectStaff())) return projectError("Staff authorisation required.", 403);
    const { data, error } = await supabaseAdmin.from("client_projects")
      .select("id,name,location,description,status,progress_percent,start_date,target_date,created_at,updated_at")
      .order("created_at", { ascending: false }).limit(150);
    if (error) return projectError("Project records are unavailable.", 503);
    return NextResponse.json({ projects: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return projectError("Unable to load projects.", 503); }
}

export async function POST(request: Request) {
  try {
    const staff = await getProjectStaff();
    if (!staff) return projectError("Staff authorisation required.", 403);
    if (!validProjectOrigin(request)) return projectError("Invalid request origin.", 403);
    const input = parseProject(await request.json());
    if (!input) return projectError("Provide a valid project name, location, progress, stage and dates.");
    const { data, error } = await supabaseAdmin.from("client_projects")
      .insert(input).select("id,name").single();
    if (error) {
      console.error("Create client project error:", error.message);
      return projectError("Project creation failed.", 503);
    }
    return NextResponse.json({ project: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch { return projectError("Unable to save project.", 400); }
}

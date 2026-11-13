import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProjectStaff, isProjectId, projectError, validProjectOrigin } from "@/lib/project-admin";

type Context = { params: Promise<{ id: string }> };

// An invitation email is sent only on explicit staff submission.
// Owner membership comes from a server-authenticated admin, NEVER from self signup or user metadata.
export async function POST(request: Request, context: Context) {
  try {
    const staff = await getProjectStaff();
    if (!staff || staff.role !== "admin") return projectError("Administrator access required to invite clients.", 403);
    if (!validProjectOrigin(request)) return projectError("Invalid request origin.", 403);
    const { id } = await context.params;
    if (!isProjectId(id)) return projectError("Invalid project ID.");
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length < 5 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        email.includes("%") || email.includes("_")) return projectError("Enter a valid client email address.");

    const { data: project, error: pError } = await supabaseAdmin.from("client_projects")
      .select("id").eq("id", id).maybeSingle();
    if (pError || !project) return projectError("Project not found.", 404);

    const { data: profile, error: lookupError } = await supabaseAdmin.from("profiles")
      .select("id,role").ilike("email", email).maybeSingle();
    if (lookupError) return projectError("Unable to look up client account.", 503);
    if (profile && ["admin","manager","operator","accountant"].includes(profile.role)) {
      return projectError("Staff accounts cannot be enrolled through client invitations.", 409);
    }

    let userId = profile?.id;
    let invitationSent = false;
    if (!userId) {
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: "https://rexyblockfactory.com/project-accept-invite",
      });
      if (error || !data.user) {
        console.error("Owner invite failed:", error?.message);
        return projectError("Invitation was not sent. If this email already has an account, ask an administrator to confirm the registered email.", 409);
      }
      userId = data.user.id;
      invitationSent = true;
    }
    const { error } = await supabaseAdmin.from("client_project_members")
      .upsert({ project_id: id, user_id: userId }, { onConflict: "project_id,user_id", ignoreDuplicates: true });
    if (error) {
      console.error("Owner membership create failed:", error.message);
      return projectError("Client account could not be linked to this project. Please contact an administrator.", 503);
    }
    return NextResponse.json({ success: true, invitationSent,
      message: invitationSent ? "Invitation sent. Ask the owner to check their email." : "Existing client account linked. Ask them to sign in at /project-login." },
      { headers: { "Cache-Control": "no-store" } });
  } catch { return projectError("Unable to invite project owner.", 400); }
}

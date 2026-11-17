import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProjectStaff, isProjectId, projectError, validProjectOrigin } from "@/lib/project-admin";
import { projectInviteRedirect } from "@/lib/project-invite";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const staff = await getProjectStaff();
    if (!staff || staff.role !== "admin") return projectError("Administrator access required to invite clients.", 403);
    if (!validProjectOrigin(request)) return projectError("Invalid request origin.", 403);
    const { id } = await context.params;
    if (!isProjectId(id)) return projectError("Invalid project ID.");
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length < 5 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        email.includes("%") || email.includes("_")) return projectError("Enter a valid client email address.");

    const { data: project, error: pError } = await supabaseAdmin.from("client_projects")
      .select("id").eq("id", id).maybeSingle();
    if (pError || !project) return projectError("Project not found.", 404);

    const { data: profile, error: lookupError } = await supabaseAdmin.from("profiles")
      .select("id,role").ilike("email", email).maybeSingle();
    if (lookupError) return projectError("Unable to look up client account.", 503);
    if (profile && !["unassigned", "project_owner", "employee"].includes(profile.role)) {
      return projectError("This account cannot be enrolled as a project owner. Use a separate owner email.", 409);
    }

    let userId = profile?.id;
    let invitationSent = false;
    if (userId) {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (error || data.user?.email?.toLowerCase() !== email || !data.user.email_confirmed_at) {
        return projectError("This account has not confirmed this email yet. Ask the owner to finish their invite or confirm their email, then retry.", 409);
      }
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: projectInviteRedirect(),
      });
      if (error || !data.user) {
        console.error("Owner invite failed:", error?.code);
        return projectError("Invitation was not sent. Check the registered email and invitation settings, then retry.", 409);
      }
      userId = data.user.id;
      invitationSent = true;
    }

    const { error } = await supabaseAdmin.rpc("enroll_rexy_project_owner", {
      p_project_id: id, p_user_id: userId, p_email: email, p_admin_id: staff.userId,
    });
    if (error) {
      console.error("Owner enrollment failed:", error.code);
      return projectError(invitationSent
        ? "The email was sent, but the project was not linked. Ask the owner to accept the email, then retry linking."
        : "The account could not be linked. Check the email and role and try again.", 409);
    }
    return NextResponse.json({ success: true, invitationSent,
      message: invitationSent ? "Invitation sent. Ask the owner to check their email." : "Existing client account linked. Ask them to sign in at /project-login or choose Set or reset password if they have not set one." },
      { headers: { "Cache-Control": "no-store" } });
  } catch { return projectError("Unable to invite project owner.", 400); }
}

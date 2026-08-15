import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ALLOWED_ROLES = [
  "manager",
  "operator",
  "production_staff",
  "accountant",
] as const;

type InviteRole = (typeof ALLOWED_ROLES)[number];

interface InviteRequest {
  email?: string;
  full_name?: string;
  role?: InviteRole;
}

export async function POST(request: Request) {
  try {
    // Get the currently authenticated user
    // from the server-side Supabase session.
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Not authenticated.",
        },
        { status: 401 }
      );
    }

    // Check the user's role using the privileged
    // server client.
    const { data: adminProfile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error(
        "Admin profile lookup failed:",
        profileError
      );

      return NextResponse.json(
        {
          error: "Unable to verify administrator access.",
        },
        { status: 500 }
      );
    }

    if (adminProfile?.role !== "admin") {
      return NextResponse.json(
        {
          error: "Administrator access required.",
        },
        { status: 403 }
      );
    }

    const body =
      (await request.json()) as InviteRequest;

    const email =
      body.email?.trim().toLowerCase();

    const fullName =
      body.full_name?.trim();

    const role = body.role;

    if (!email) {
      return NextResponse.json(
        {
          error: "Email is required.",
        },
        { status: 400 }
      );
    }

    if (!fullName) {
      return NextResponse.json(
        {
          error: "Full name is required.",
        },
        { status: 400 }
      );
    }

    if (
      !role ||
      !ALLOWED_ROLES.includes(role)
    ) {
      return NextResponse.json(
        {
          error: "Invalid user role.",
        },
        { status: 400 }
      );
    }

    // Prevent the Admin from accidentally
    // inviting the Admin's own email.
    if (
      user.email?.toLowerCase() === email
    ) {
      return NextResponse.json(
        {
          error:
            "You cannot invite your own email address.",
        },
        { status: 400 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const redirectTo =
      `${siteUrl}/update-password`;

    // Send the invitation.
    // This MUST use the server-only admin client.
    const { data, error } =
      await supabaseAdmin.auth.admin
        .inviteUserByEmail(email, {
          data: {
            full_name: fullName,
          },
          redirectTo,
        });

    if (error) {
      console.error(
        "Invitation failed:",
        error
      );

      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        {
          error:
            "Invitation was not created.",
        },
        { status: 500 }
      );
    }

    // The database trigger should create the
    // profile automatically. We then assign
    // the role selected by the Admin.
    const { error: roleError } =
      await supabaseAdmin
        .from("profiles")
        .update({
          full_name: fullName,
          email,
          role,
        })
        .eq("id", data.user.id);

    if (roleError) {
      console.error(
        "Profile role update failed:",
        roleError
      );

      return NextResponse.json(
        {
          error:
            `User was invited, but the profile could not be updated: ${roleError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Invitation sent successfully.",
    });
  } catch (error) {
    console.error(
      "Invitation route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}
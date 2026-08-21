import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{
    userId: string;
  }>;
}

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    // Verify the currently authenticated user.
    const supabase =
      await createSupabaseServerClient();

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

    // Verify that the current user is an administrator.
    const {
      data: adminProfile,
      error: profileError,
    } = await supabaseAdmin
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
          error:
            "Unable to verify administrator access.",
        },
        { status: 500 }
      );
    }

    if (adminProfile?.role !== "admin") {
      return NextResponse.json(
        {
          error:
            "Administrator access required.",
        },
        { status: 403 }
      );
    }

    const { userId } = await context.params;

    if (!userId) {
      return NextResponse.json(
        {
          error: "User ID is required.",
        },
        { status: 400 }
      );
    }

    // Prevent an administrator from deleting
    // their own account through User Management.
    if (userId === user.id) {
      return NextResponse.json(
        {
          error:
            "You cannot delete your own administrator account.",
        },
        { status: 400 }
      );
    }

    // Verify the target user exists before deleting.
    const {
      data: targetUser,
      error: targetUserError,
    } = await supabaseAdmin.auth.admin.getUserById(
      userId
    );

    if (targetUserError) {
      console.error(
        "Target user lookup failed:",
        targetUserError
      );

      return NextResponse.json(
        {
          error:
            "Unable to find the user.",
        },
        { status: 404 }
      );
    }

    if (!targetUser?.user) {
      return NextResponse.json(
        {
          error: "User not found.",
        },
        { status: 404 }
      );
    }

    // Delete the Auth user.
    //
    // The profiles row will be removed automatically
    // because profiles_id_fkey now uses ON DELETE CASCADE.
    const { error: deleteError } =
      await supabaseAdmin.auth.admin.deleteUser(
        userId
      );

    if (deleteError) {
      console.error(
        "User deletion failed:",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            `Failed to delete user: ${deleteError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete user route error:",
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
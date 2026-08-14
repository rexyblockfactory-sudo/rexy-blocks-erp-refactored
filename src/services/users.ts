import { supabase } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/permissions";

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export async function getCurrentUserProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      data: null,
      error:
        userError ??
        new Error("Not authenticated"),
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, role, created_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: new Error(
        `Profile lookup failed: ${error.message}`
      ),
    };
  }

  if (!data) {
    return {
      data: null,
      error: new Error(
        "Authenticated user has no visible profile."
      ),
    };
  }

  return {
    data: data as UserProfile,
    error: null,
  };
}

export async function getUsers() {
  return supabase
    .from("profiles")
    .select(
      "id, email, full_name, role, created_at"
    )
    .order("created_at", {
      ascending: true,
    });
}

export async function updateUserRole(
  userId: string,
  role: UserRole
) {
  return supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);
}
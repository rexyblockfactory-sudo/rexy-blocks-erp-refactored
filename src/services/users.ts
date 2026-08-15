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

export async function inviteUser(
  email: string,
  fullName: string,
  role: Exclude<UserRole, "admin">
) {
  const response = await fetch(
    "/api/admin/users/invite",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        role,
      }),
    }
  );

  let result: {
    success?: boolean;
    message?: string;
    error?: string;
  } = {};

  try {
    result = await response.json();
  } catch {
    return {
      data: null,
      error: new Error(
        "The server returned an invalid response."
      ),
    };
  }

  if (!response.ok) {
    return {
      data: null,
      error: new Error(
        result.error ||
          "Unable to send invitation."
      ),
    };
  }

  return {
    data: result,
    error: null,
  };
}
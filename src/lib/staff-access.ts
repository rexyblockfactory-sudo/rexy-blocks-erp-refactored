import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const staffRoles = new Set(["admin", "manager", "operator", "accountant"]);

type StaffAccess = { status: "staff"; role: string; userId: string } | { status: "signed-out" | "denied" };

export const getStaffAccess = cache(async (): Promise<StaffAccess> => {
  const session = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await session.auth.getUser();
  if (authError || !user) return { status: "signed-out" };

  const { data: profile, error: profileError } = await session.from("profiles")
    .select("role").eq("id", user.id).maybeSingle();
  if (profileError) {
    console.error("Unable to verify ERP role:", profileError.message);
    return { status: "denied" };
  }
  const role = profile?.role;
  return typeof role === "string" && staffRoles.has(role) ? { status: "staff", role, userId: user.id } : { status: "denied" };
});

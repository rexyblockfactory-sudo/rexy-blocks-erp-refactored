import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const isProjectId = (value: string) => /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value);

export type ClientProject = {
  id: string; name: string; location: string; description: string;
  status: "planning" | "in_progress" | "on_hold" | "completed";
  progress_percent: number; start_date: string | null; target_date: string | null;
  created_at: string; updated_at: string;
};
export type ProjectMilestone = {
  id: string; project_id: string; title: string; status: "pending" | "in_progress" | "completed";
  due_date: string | null; sort_order: number;
};
export type ProjectUpdate = {
  id: string; project_id: string; heading: string; details: string;
  progress_percent: number; created_at: string;
};
export type ProjectPhoto = { id: string; caption: string; url: string; created_at: string };
export type OwnerProjectDetail = {
  project: ClientProject; milestones: ProjectMilestone[];
  updates: ProjectUpdate[]; photos: ProjectPhoto[];
};

export const getSignedInProjectOwnerId = cache(async (): Promise<string | null> => {
  const session = await createSupabaseServerClient();
  const { data: { user }, error } = await session.auth.getUser();
  if (error || !user) return null;
  const { data: profile, error: profileError } = await session.from("profiles")
    .select("role").eq("id", user.id).maybeSingle();
  return !profileError && profile?.role === "project_owner" ? user.id : null;
});

export async function isProjectMember(userId: string, projectId: string): Promise<boolean> {
  if (!isProjectId(projectId)) return false;
  const { data, error } = await supabaseAdmin.from("client_project_members")
    .select("project_id").eq("project_id", projectId).eq("user_id", userId).maybeSingle();
  if (error) {
    console.error("Owner membership verification failed:", error.message);
    return false;
  }
  return Boolean(data);
}

export async function loadOwnerProjects(userId: string): Promise<ClientProject[]> {
  const { data: membership, error: memberError } = await supabaseAdmin.from("client_project_members")
    .select("project_id").eq("user_id", userId).limit(100);
  if (memberError) throw new Error("Unable to verify project access.");
  const ids = (membership ?? []).map(entry => entry.project_id).filter(isProjectId);
  if (!ids.length) return [];
  const { data, error } = await supabaseAdmin.from("client_projects")
    .select("id,name,location,description,status,progress_percent,start_date,target_date,created_at,updated_at")
    .in("id", ids).order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load projects.");
  return (data ?? []) as ClientProject[];
}

export async function loadOwnerProject(userId: string, projectId: string): Promise<OwnerProjectDetail | null> {
  // Always check membership BEFORE reading project information or creating photo URLs.
  if (!(await isProjectMember(userId, projectId))) return null;
  const { data: project, error: pErr } = await supabaseAdmin.from("client_projects")
    .select("id,name,location,description,status,progress_percent,start_date,target_date,created_at,updated_at")
    .eq("id", projectId).maybeSingle();
  if (pErr || !project) return null;

  const [milestones, updates, photos] = await Promise.all([
    supabaseAdmin.from("client_project_milestones")
      .select("id,project_id,title,status,due_date,sort_order")
      .eq("project_id", projectId).order("sort_order").order("created_at"),
    supabaseAdmin.from("client_project_updates")
      .select("id,project_id,heading,details,progress_percent,created_at")
      .eq("project_id", projectId).eq("is_visible", true).order("created_at", { ascending: false }).limit(100),
    supabaseAdmin.from("client_project_photos")
      .select("id,storage_path,caption,created_at")
      .eq("project_id", projectId).order("created_at", { ascending: false }).limit(50),
  ]);
  if (milestones.error || updates.error || photos.error) throw new Error("Project details are temporarily unavailable.");

  const signed = await Promise.all((photos.data ?? []).map(async (item) => {
    const { data, error } = await supabaseAdmin.storage.from("client-project-media")
      .createSignedUrl(item.storage_path, 300);
    if (error || !data?.signedUrl) return null;
    return { id: item.id, caption: item.caption, created_at: item.created_at, url: data.signedUrl };
  }));
  return {
    project: project as ClientProject,
    milestones: (milestones.data ?? []) as ProjectMilestone[],
    updates: (updates.data ?? []) as ProjectUpdate[],
    photos: signed.filter((photo): photo is ProjectPhoto => photo !== null),
  };
}

export const projectStatusLabel = {
  planning: "Planning",
  in_progress: "In progress",
  on_hold: "On hold",
  completed: "Completed",
} as const;

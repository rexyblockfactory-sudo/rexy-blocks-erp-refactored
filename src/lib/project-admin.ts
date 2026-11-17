import "server-only";
import { getStaffAccess } from "@/lib/staff-access";
import { isProjectId } from "@/lib/client-projects";
import { NextResponse } from "next/server";

export { isProjectId };

export type ProjectStaff = { userId: string; role: "admin" | "manager" };
export async function getProjectStaff(): Promise<ProjectStaff | null> {
  const access = await getStaffAccess();
  if (access.status !== "staff" || (access.role !== "admin" && access.role !== "manager")) return null;
  return { userId: access.userId, role: access.role };
}
export function projectError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
export function validProjectOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(request.url).origin === new URL(origin).origin; }
  catch { return false; }
}
export function validDate(value: unknown): string | null | false {
  if (value === null || value === "" || value === undefined) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== value) return false;
  return value;
}
export function validPercent(value: unknown): number | null {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 100 ? number : null;
}
export function parseProject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const name = typeof v.name === "string" ? v.name.trim() : "";
  const location = typeof v.location === "string" ? v.location.trim() : "";
  const description = typeof v.description === "string" ? v.description.trim() : "";
  const status = v.status;
  const progress_percent = validPercent(v.progress_percent);
  const start_date = validDate(v.start_date);
  const target_date = validDate(v.target_date);
  if (name.length < 4 || name.length > 160 || location.length < 2 || location.length > 160 ||
      description.length > 5000 || !["planning", "in_progress", "on_hold", "completed"].includes(String(status)) ||
      progress_percent === null || start_date === false || target_date === false) return null;
  if (start_date && target_date && target_date < start_date) return null;
  return { name, location, description, status: status as string, progress_percent, start_date, target_date };
}
export function parseUpdate(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string,unknown>;
  const heading = typeof v.heading === "string" ? v.heading.trim() : "";
  const details = typeof v.details === "string" ? v.details.trim() : "";
  const progress_percent = validPercent(v.progress_percent);
  if (heading.length < 4 || heading.length > 160 || details.length < 10 || details.length > 5000 || progress_percent === null) return null;
  return { heading, details, progress_percent, is_visible: true };
}
export function parseMilestone(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string,unknown>;
  const title = typeof v.title === "string" ? v.title.trim() : "";
  const status = v.status;
  const due_date = validDate(v.due_date);
  const sort_order = typeof v.sort_order === "number" ? v.sort_order : 0;
  if (title.length < 3 || title.length > 160 ||
      !["pending","in_progress","completed"].includes(String(status)) ||
      due_date === false || !Number.isInteger(sort_order) || sort_order < 0 || sort_order > 10000) return null;
  return { title, status: status as "pending" | "in_progress" | "completed", due_date, sort_order };
}

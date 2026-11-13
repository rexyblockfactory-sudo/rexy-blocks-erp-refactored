import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export function propertyPhotoIndex(value: string): number | null {
  return /^[0-2]$/.test(value) ? Number(value) : null;
}

export async function serveSubmissionPhoto(submissionId: string, paths: string[], index: number) {
  const path = submissionId + "/" + index + ".webp";
  if (paths[index] !== path) return new Response(null, { status: 404 });
  const {data,error} = await supabaseAdmin.storage.from("property-submission-photos").download(path);
  if (error || !data) return new Response(null, {status:404});
  return new Response(data,{
    headers:{"Content-Type":"image/webp","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"},
  });
}

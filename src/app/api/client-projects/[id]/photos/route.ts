import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProjectStaff, isProjectId, projectError, validProjectOrigin } from "@/lib/project-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";

export async function POST(request: Request, context: Context) {
  try {
    if (!(await getProjectStaff())) return projectError("Staff authorisation required.", 403);
    if (!validProjectOrigin(request)) return projectError("Invalid request origin.", 403);
    const { id } = await context.params;
    if (!isProjectId(id)) return projectError("Invalid project ID.");
    if (Number(request.headers.get("content-length") ?? 0) > 4200000) {
      return projectError("Maximum upload size is 4 MB.", 413);
    }
    const { data: project } = await supabaseAdmin.from("client_projects").select("id").eq("id", id).maybeSingle();
    if (!project) return projectError("Project not found.", 404);
    const form = await request.formData();
    const photo = form.get("photo");
    const caption = typeof form.get("caption") === "string" ? String(form.get("caption")).trim() : "";
    if (!(photo instanceof File) || !["image/jpeg","image/png","image/webp"].includes(photo.type)
      || photo.size < 200 || photo.size > 4000000 || caption.length > 240) {
      return projectError("Choose a JPEG, PNG or WebP image under 4 MB and a short caption.");
    }
    if (form.get("confirmed") !== "yes") return projectError("Confirm that the image is authorised for client sharing.");
    const bytes = new Uint8Array(await photo.arrayBuffer());
    const isJpeg = bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
    const isPng = bytes[0]===137 && bytes[1]===80 && bytes[2]===78 && bytes[3]===71;
    const isWebp = new TextDecoder().decode(bytes.slice(0,4)) === "RIFF" &&
                   new TextDecoder().decode(bytes.slice(8,12)) === "WEBP";
    if ((photo.type==="image/jpeg"&&!isJpeg) || (photo.type==="image/png"&&!isPng) || (photo.type==="image/webp"&&!isWebp)) {
      return projectError("The file signature does not match its image format.");
    }
    const ext=photo.type==="image/jpeg"?"jpg":photo.type==="image/png"?"png":"webp";
    const path=id+"/"+randomUUID()+"."+ext;
    const { error: uploadError } = await supabaseAdmin.storage.from("client-project-media")
      .upload(path, bytes, { contentType: photo.type, cacheControl: "300", upsert: false });
    if (uploadError) return projectError("Photo could not be uploaded.", 503);

    const session = await createSupabaseServerClient();
    const { data: { user } } = await session.auth.getUser();
    const { data, error } = await supabaseAdmin.from("client_project_photos")
      .insert({ project_id: id, caption, storage_path: path, uploaded_by: user?.id ?? null })
      .select("id").single();
    if (error) {
      await supabaseAdmin.storage.from("client-project-media").remove([path]);
      return projectError("Photo record could not be saved.", 503);
    }
    return NextResponse.json({ photo: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch { return projectError("Photo upload failed.", 400); }
}

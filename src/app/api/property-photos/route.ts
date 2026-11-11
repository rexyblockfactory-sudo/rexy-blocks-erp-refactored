import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { badRequest, propertyStaff, verifySameOrigin } from "@/lib/property-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const staff = await propertyStaff();
    if (!staff) return badRequest("Authorised property staff access required.", 403);
    if (!verifySameOrigin(request)) return badRequest("Invalid origin.", 403);
    if (Number(request.headers.get("content-length") ?? 0) > 11 * 1024 * 1024) {
      return badRequest("Image exceeds the 10 MB upload limit.", 413);
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return badRequest("Choose a property photo.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return badRequest("Supported images are JPEG, PNG or WebP.");
    }
    if (file.size < 200 || file.size > 10 * 1024 * 1024) {
      return badRequest("Select a photo between 200 bytes and 10 MB.");
    }
    if (form.get("permission_confirmed") !== "yes") {
      return badRequest("Confirm that you have permission to upload and market this photo.");
    }
    const buffer = new Uint8Array(await file.arrayBuffer());
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer[0] === 137 && buffer[1] === 80 && buffer[2] === 78 && buffer[3] === 71;
    const isWebp = new TextDecoder("ascii").decode(buffer.slice(0, 4)) === "RIFF"
      && new TextDecoder("ascii").decode(buffer.slice(8, 12)) === "WEBP";
    if ((file.type === "image/jpeg" && !isJpeg) ||
        (file.type === "image/png" && !isPng) ||
        (file.type === "image/webp" && !isWebp)) {
      return badRequest("Image content did not match the selected format.");
    }
    const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
    const path = staff.userId + "/" + randomUUID() + "." + extension;
    const { error } = await supabaseAdmin.storage.from("property-photos")
      .upload(path, buffer, { contentType: file.type, cacheControl: "3600", upsert: false });
    if (error) {
      console.error("Property photo upload error:", error.message);
      return badRequest("Property photo storage is not available. Confirm the storage bucket is installed.", 503);
    }
    const { data } = supabaseAdmin.storage.from("property-photos").getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl }, { status: 201 });
  } catch {
    return badRequest("Unable to upload property photograph.", 400);
  }
}

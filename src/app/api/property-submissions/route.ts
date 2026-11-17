import { createHmac, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { badRequest, verifySameOrigin } from "@/lib/property-admin";
import { parsePropertySubmission } from "@/lib/property-submission-input";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const bucketName = "property-submission-photos";

export async function POST(request: Request) {
  if (!verifySameOrigin(request)) return badRequest("Invalid request origin.", 403);
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;")) {
    return badRequest("Submit using the property form.", 415);
  }
  if (Number(request.headers.get("content-length") || 0) > 4_100_000) return badRequest("Use smaller photos and try again.", 413);
  const ip = request.headers.get("x-vercel-forwarded-for")?.trim() || (process.env.VERCEL ? "" : "127.0.0.1");
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isIP(ip) || !secret) return badRequest("Submissions are temporarily unavailable. Try again later.", 503);
  const clientKey = createHmac("sha256", secret).update("property-intake-v1:" + ip).digest("hex");

  const bucket = supabaseAdmin.storage.from(bucketName);
  const paths: string[] = [];
  let saved = false;
  try {
    const {data:allowed,error:limitError} = await supabaseAdmin.rpc("consume_property_submission_limit",{p_key:clientKey});
    if (limitError) return badRequest("Submissions are temporarily unavailable. Try again later.",503);
    if (!allowed) return NextResponse.json({error:"Too many submissions. Please try again in an hour."},{
      status:429,headers:{"Cache-Control":"no-store","Retry-After":"3600"},
    });

    let input;
    try {
      const form = await request.formData();
      if (form.get("website")) return badRequest("Unable to submit this form.");
      input = parsePropertySubmission(form);
    } catch (error) {
      return badRequest(error instanceof Error && error.name === "Error" ? error.message : "Check your details and try again.");
    }
    const id = randomUUID();
    for (const [index,file] of input.files.entries()) {
      let image: Buffer;
      try {
        const source = sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:24_000_000,failOn:"error"});
        const meta = await source.metadata();
        if (!["jpeg","png","webp"].includes(meta.format ?? "") || (meta.pages ?? 1) !== 1) throw new Error();
        // Re-encode to remove EXIF, GPS and original file metadata.
        image = await source.rotate().resize({width:1800,height:1800,fit:"inside",withoutEnlargement:true}).webp({quality:82}).toBuffer();
        if (image.byteLength > 3_145_728) throw new Error();
      } catch {
        return badRequest("One photo could not be read. Use a regular JPEG, PNG or WebP photo, or submit without it.");
      }
      const path = id + "/" + index + ".webp";
      const {error} = await bucket.upload(path,image,{contentType:"image/webp",cacheControl:"0",upsert:false});
      if (error) return badRequest("We couldn't save the photos. Try again later.",503);
      paths.push(path);
    }
    const {data,error} = await supabaseAdmin.from("property_submissions").insert({
      id,contact_name:input.contact_name,contact_phone:input.contact_phone,
      property_data:input.property_data,photo_paths:paths,
    }).select("reference").single();
    if (error || !data) {
      // If the response was lost after the write, don't delete attached files.
      const existing=await supabaseAdmin.from("property_submissions").select("reference").eq("id",id).maybeSingle();
      if (existing.data) {
        saved=true;
        return NextResponse.json({reference:existing.data.reference},{status:201,headers:{"Cache-Control":"no-store"}});
      }
      if (existing.error) saved=true;
      return badRequest("We couldn't confirm the submission. Contact Rexy if the problem continues.",503);
    }
    saved = true;
    return NextResponse.json({reference:data.reference},{status:201,headers:{"Cache-Control":"no-store"}});
  } catch {
    return badRequest("We couldn't save the submission. Try again later.",503);
  } finally {
    if (!saved && paths.length) await bucket.remove(paths).catch(() => {});
  }
}

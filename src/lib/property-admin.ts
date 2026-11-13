import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const PROPERTY_UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export const PROPERTY_ROLES = ["admin", "manager"] as const;
export type PropertyStaff = { userId: string; role: "admin" | "manager" };

export async function propertyStaff(): Promise<PropertyStaff | null> {
  const session = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await session.auth.getUser();
  if (authError || !user) return null;
  // Roles are stored in the protected profiles table, never in editable user metadata.
  const { data: profile, error } = await supabaseAdmin
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (error || !profile || !PROPERTY_ROLES.includes(profile.role)) return null;
  return { userId: user.id, role: profile.role };
}

export function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export function verifySameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);
    // Vercel custom domains and trusted deployment hosts are on their own origins.
    return originUrl.origin === requestUrl.origin;
  } catch {
    return false;
  }
}

export function validatePhotoUrls(value: unknown, listingId?: string): string[] | null {
  if (!Array.isArray(value) || value.length > 16) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const uploadedPrefix = base.replace(/\/$/, "") + "/storage/v1/object/public/property-photos/";
  const photos = value.filter((x): x is string => typeof x === "string");
  if (photos.length !== value.length) return null;
  for (const photo of photos) {
    const managedPhoto = photo.match(/^\/api\/property-listing-media\/([a-f0-9-]+)\/[0-2]$/);
    if (managedPhoto && listingId && PROPERTY_UUID.test(listingId) && managedPhoto[1] === listingId) continue;
    if (!(photo.startsWith(uploadedPrefix) &&
      /^https:\/\/[^?#\s"'<>]+$/.test(photo) &&
      /^[a-z0-9-]+\/[a-z0-9-]+\.(webp|png|jpe?g)$/i.test(photo.slice(uploadedPrefix.length))
    ) && !/^\/images\/properties\/[a-z0-9/_-]+\.(webp|png|jpe?g)$/i.test(photo)) {
      return null;
    }
  }
  return [...new Set(photos)];
}

type EditableProperty = {
  market: "sale" | "stay" | "rent"; slug: string; title: string; description: string;
  city: string; region: string; neighborhood: string | null;
  construction_status: string;
  price_ghs: number | null; bedrooms: number | null; bathrooms: number | null;
  max_guests: number | null; photo_urls: string[]; amenities: string[];
};

export function parseEditableProperty(value: unknown, listingId?: string): EditableProperty | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const x = value as Record<string, unknown>;
  const market = x.market;
  if (market !== "sale" && market !== "stay" && market !== "rent") return null;
  const title = typeof x.title === "string" ? x.title.trim() : "";
  const slug = typeof x.slug === "string" ? x.slug.trim() : "";
  const city = typeof x.city === "string" ? x.city.trim() : "";
  const region = typeof x.region === "string" ? x.region.trim() : "";
  const description = typeof x.description === "string" ? x.description.trim() : "";
  const neighborhood = typeof x.neighborhood === "string" ? x.neighborhood.trim() : "";
  const construction = x.construction_status;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120 ||
    title.length < 4 || title.length > 160 || city.length < 2 || city.length > 80 ||
    region.length < 2 || region.length > 80 || description.length > 6000 ||
    neighborhood.length > 160 ||
    !["completed", "under_construction", "unknown"].includes(String(construction))) return null;

  const nullableNumber = (n: unknown, max: number, integer: boolean): number | null | false => {
    if (n === null || n === "" || n === undefined) return null;
    if (typeof n !== "number" && typeof n !== "string") return false;
    const value = Number(n);
    if (!Number.isFinite(value) || value < 0 || value > max || (integer && !Number.isInteger(value))) return false;
    return value;
  };
  const price = nullableNumber(x.price_ghs, 1_000_000_000, false);
  const beds = nullableNumber(x.bedrooms, 30, true);
  const baths = nullableNumber(x.bathrooms, 30, true);
  const maxGuests = nullableNumber(x.max_guests, 100, true);
  if (price === false || beds === false || baths === false || maxGuests === false) return null;
  if (price !== null && price <= 0) return null;
  if (maxGuests !== null && maxGuests < 1) return null;
  if (market === "stay" && maxGuests === null) return null;
  const photoUrls = validatePhotoUrls(x.photo_urls, listingId);
  if (!photoUrls) return null;
  if (!Array.isArray(x.amenities) || x.amenities.length > 30 ||
      x.amenities.some((v) => typeof v !== "string" || v.trim().length === 0 || v.length > 80)) return null;
  return {
    market, slug, title, description, city, region, neighborhood: neighborhood || null,
    construction_status: String(construction), price_ghs: price,
    bedrooms: beds, bathrooms: baths, max_guests: market === "stay" ? maxGuests : null,
    photo_urls: photoUrls, amenities: (x.amenities as string[]).map(x => x.trim()),
  };
}

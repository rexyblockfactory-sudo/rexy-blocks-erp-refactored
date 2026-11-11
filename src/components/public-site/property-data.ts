import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PropertyMarket = "sale" | "stay" | "rent";
export type PublishedProperty = {
  id: string;
  slug: string;
  market: PropertyMarket;
  title: string;
  description: string;
  city: string;
  region: string;
  neighborhood: string | null;
  construction_status: "completed" | "under_construction" | "unknown";
  price_ghs: number;
  bedrooms: number | null;
  bathrooms: number | null;
  max_guests: number | null;
  amenities: string[];
  photo_urls: string[];
};

export type PropertyFilters = {
  city?: string;
  minBeds?: number;
  maxPrice?: number;
  guests?: number;
  sort?: "newest" | "price-low" | "price-high";
};

const fields = "id,slug,market,title,description,city,region,neighborhood,construction_status,price_ghs,bedrooms,bathrooms,max_guests,amenities,photo_urls";

function parseProperty(row: Record<string, unknown>, market: PropertyMarket): PublishedProperty | null {
  if (row.market !== market || typeof row.id !== "string" ||
      typeof row.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug) ||
      typeof row.title !== "string" || typeof row.city !== "string" ||
      typeof row.region !== "string" || typeof row.description !== "string") {
    return null;
  }

  const price = Number(row.price_ghs);
  if (!Number.isFinite(price) || price <= 0) return null;

  return {
    id: row.id,
    slug: row.slug,
    market,
    title: row.title,
    description: row.description,
    city: row.city,
    region: row.region,
    neighborhood: typeof row.neighborhood === "string" ? row.neighborhood : null,
    construction_status: row.construction_status === "under_construction" ? "under_construction" : row.construction_status === "completed" ? "completed" : "unknown",
    price_ghs: price,
    bedrooms: row.bedrooms == null ? null : Math.max(0, Number(row.bedrooms) || 0),
    bathrooms: row.bathrooms == null ? null : Math.max(0, Number(row.bathrooms) || 0),
    max_guests: row.max_guests == null ? null : Math.max(1, Number(row.max_guests) || 1),
    amenities: Array.isArray(row.amenities) ? row.amenities.filter((item): item is string => typeof item === "string") : [],
    photo_urls: Array.isArray(row.photo_urls) ?
      row.photo_urls.filter((url): url is string =>
        typeof url === "string" && (/^https:\/\/[^ "'<>]+$/i.test(url) || /^\/images\/properties\/[a-zA-Z0-9/_-]+\.(?:jpg|jpeg|png|webp)$/.test(url))
      ) : [],
  };
}

export function propertyPath(property: Pick<PublishedProperty, "market" | "slug">): string {
  return (property.market === "sale" ? "/homes-for-sale/" : property.market === "rent" ? "/rentals/" : "/rexy-stays/") + property.slug;
}

export function propertyPrice(price: number): string {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 }).format(price);
}

export async function getPublishedProperties(market: PropertyMarket, filters: PropertyFilters = {}):
  Promise<{ properties: PublishedProperty[]; available: boolean }> {
  try {
    const db = await createSupabaseServerClient();
    let query = db.from("property_listings").select(fields)
      .eq("market", market).eq("status", "published").not("verified_at", "is", null);

    const city = filters.city?.trim().slice(0, 70).replace(/[%_,]/g, "");
    if (city) query = query.ilike("city", "%" + city + "%");
    if (filters.minBeds && Number.isSafeInteger(filters.minBeds) && filters.minBeds > 0) {
      query = query.gte("bedrooms", Math.min(20, filters.minBeds));
    }
    if (filters.maxPrice && Number.isFinite(filters.maxPrice) && filters.maxPrice > 0) {
      query = query.lte("price_ghs", filters.maxPrice);
    }
    if (market === "stay" && filters.guests && Number.isSafeInteger(filters.guests) && filters.guests > 0) {
      query = query.gte("max_guests", Math.min(100, filters.guests));
    }

    const ascending = filters.sort === "price-low";
    const orderColumn = filters.sort?.startsWith("price-") ? "price_ghs" : "published_at";
    const { data, error } = await query.order(orderColumn, { ascending }).limit(60);
    if (error) {
      console.error("Property catalogue read unavailable:", error.message);
      return { properties: [], available: false };
    }
    return {
      properties: ((data ?? []) as Record<string, unknown>[])
        .map((row) => parseProperty(row, market))
        .filter((property): property is PublishedProperty => property !== null),
      available: true,
    };
  } catch (error) {
    console.error("Property catalogue read failed:", error);
    return { properties: [], available: false };
  }
}

export async function getPublishedProperty(market: PropertyMarket, slug: string): Promise<PublishedProperty | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) return null;
  try {
    const db = await createSupabaseServerClient();
    const { data, error } = await db.from("property_listings").select(fields)
      .eq("market", market).eq("slug", slug).eq("status", "published")
      .not("verified_at", "is", null).maybeSingle();
    if (error || !data) return null;
    return parseProperty(data as Record<string, unknown>, market);
  } catch {
    return null;
  }
}

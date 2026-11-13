const googleMaps = "https://www.google.com";
const coordinatePattern = /^(-?\d{1,3}(?:\.\d{1,8})?),\s*(-?\d{1,3}(?:\.\d{1,8})?)$/;

function coordinates(value: string): string | null {
  const match = coordinatePattern.exec(value.trim());
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? `${lat},${lng}` : null;
}

export function normalizePropertyMapLink(value: unknown): { href: string; isArea: boolean } | null {
  if (typeof value !== "string" || !value.trim() || value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (url.hostname === "maps.app.goo.gl" && /^\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname)) {
      return { href: url.origin + url.pathname, isArea: false };
    }
    if (url.origin !== googleMaps && url.origin !== "https://maps.google.com") return null;

    // A viewport center must never be promoted to a property pin.
    const viewport = /^\/maps\/@([^,]+,[^,]+),(\d{1,2})z(?:\/|$)/.exec(url.pathname);
    if (viewport || (url.pathname === "/maps/@" && url.searchParams.get("map_action") === "map")) {
      const center = coordinates(viewport?.[1] ?? url.searchParams.get("center") ?? "");
      if (!center) return null;
      const zoom = Math.max(1, Math.min(21, Number(viewport?.[2] ?? url.searchParams.get("zoom")) || 16));
      return { href: `${googleMaps}/maps/@?api=1&map_action=map&center=${encodeURIComponent(center)}&zoom=${zoom}`, isArea: true };
    }

    if (/^\/maps\/place\/[^/]+(?:\/|$)/.test(url.pathname)) {
      return { href: googleMaps + url.pathname, isArea: false };
    }
    const rawQuery = /^\/maps(?:\/search)?\/?$/.test(url.pathname) ? url.searchParams.get("query") ?? url.searchParams.get("q") : null;
    const query = rawQuery?.trim();
    if (!query || query.length > 220 || /[\x00-\x1f\x7f]/.test(query)) return null;
    const pin = coordinates(query);
    if (!pin && coordinatePattern.test(query)) return null;
    const placeId = url.searchParams.get("query_place_id");
    const placeParam = placeId && /^[\w-]{1,256}$/.test(placeId) ? `&query_place_id=${encodeURIComponent(placeId)}` : "";
    return { href: `${googleMaps}/maps/search/?api=1&query=${encodeURIComponent(pin ?? query)}${placeParam}`, isArea: false };
  } catch {
    return null;
  }
}

export function publicPropertyMap(location: { map_url?: string | null; neighborhood: string | null; city: string; region: string }) {
  const custom = normalizePropertyMapLink(location.map_url);
  if (custom) return custom;
  const area = [location.neighborhood, location.city, location.region, "Ghana"].filter(Boolean).join(", ");
  return { href: `${googleMaps}/maps/search/?api=1&query=${encodeURIComponent(area)}`, isArea: true };
}

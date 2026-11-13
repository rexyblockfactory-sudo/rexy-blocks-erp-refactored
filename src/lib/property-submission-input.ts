export const submissionMarkets = ["sale", "rent", "stay"] as const;
export type SubmissionMarket = typeof submissionMarkets[number];

export const submissionPhotoLimit = 3;
export const submissionPhotoTotalBytes = 3_800_000;

export function parsePropertySubmission(form: FormData) {
  function value(name: string, min: number, max: number) {
    const item = form.get(name);
    const v = typeof item === "string" ? item.trim() : "";
    if (v.length < min || v.length > max || v.includes("\u0000")) throw new Error("Check the required property and contact details.");
    return v;
  }
  function numeric(name: string, min: number, max: number, integer: boolean) {
    const v = value(name, 0, 24);
    if (!v) return null;
    if (!(integer ? /^\d+$/ : /^\d+(?:\.\d{1,2})?$/).test(v)) throw new Error("Check the price, room counts and guest capacity.");
    const n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max) throw new Error("Check the price, room counts and guest capacity.");
    return n;
  }
  const market = value("market", 1, 8) as SubmissionMarket;
  if (!submissionMarkets.includes(market)) throw new Error("Choose sale, long-term rent or short stays.");
  const construction_status = value("construction_status", 1, 24);
  if (!["completed", "under_construction", "unknown"].includes(construction_status)) throw new Error("Choose a construction status.");
  if (form.get("authority") !== "yes" || form.get("consent") !== "yes") throw new Error("Confirm your authority and consent before submitting.");
  const contact_name = value("contact_name", 2, 100);
  const contact_phone = value("contact_phone", 7, 30);
  if (!/^\+?[\d ()-]+$/.test(contact_phone) || !/^\d{7,15}$/.test(contact_phone.replace(/\D/g, ""))) {
    throw new Error("Enter a valid phone or WhatsApp number.");
  }
  const max_guests = market === "stay" ? numeric("max_guests", 1, 100, true) : null;
  if (market === "stay" && max_guests === null) throw new Error("Enter the maximum number of short-stay guests.");
  const files = form.getAll("photos").filter(item => typeof item !== "string" && item.size > 0) as File[];
  if (files.length > submissionPhotoLimit || files.reduce((sum, file) => sum + file.size, 0) > submissionPhotoTotalBytes) {
    throw new Error("Use up to 3 photos totaling no more than 3.8 MB.");
  }
  if (files.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) throw new Error("Choose JPEG, PNG or WebP photos.");
  return {
    contact_name, contact_phone, files,
    property_data: {
      market, construction_status, max_guests,
      title: value("title", 4, 160), description: value("description", 20, 1800),
      city: value("city", 2, 80), region: value("region", 2, 80),
      neighborhood: value("neighborhood", 0, 120) || null,
      price_ghs: numeric("price_ghs", 0.01, 1_000_000_000, false),
      bedrooms: numeric("bedrooms", 0, 30, true), bathrooms: numeric("bathrooms", 0, 30, true),
    },
  };
}

export type PropertySubmissionData = ReturnType<typeof parsePropertySubmission>["property_data"];

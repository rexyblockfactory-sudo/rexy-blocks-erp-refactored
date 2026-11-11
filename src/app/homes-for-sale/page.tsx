import PropertyMarketplace, { parsePropertyFilters } from "@/components/public-site/PropertyMarketplace";
import { publicMetadata } from "@/components/public-site/site-metadata";
import "../property-marketplace.css";

export const metadata = publicMetadata(
  "Houses for Sale in Ghana | Rexy Real Estate",
  "Explore verified homes for sale in Ghana, filter by city, bedrooms and budget, and request property viewings.",
  "/homes-for-sale"
);
export const dynamic = "force-dynamic";

export default async function HomesForSalePage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parsePropertyFilters(await searchParams);
  return <PropertyMarketplace market="sale" filters={filters} />;
}

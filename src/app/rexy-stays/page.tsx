import PropertyMarketplace, { parsePropertyFilters } from "@/components/public-site/PropertyMarketplace";
import { publicMetadata } from "@/components/public-site/site-metadata";
import "../property-marketplace.css";

export const metadata = publicMetadata(
  "Rexy Stays | Short-Stay Homes in Ghana",
  "Explore verified short-stay homes in Ghana, filter by city, guests and price, and enquire about dates before booking.",
  "/rexy-stays"
);
export const dynamic = "force-dynamic";

export default async function RexyStaysPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parsePropertyFilters(await searchParams);
  return <PropertyMarketplace market="stay" filters={filters} />;
}

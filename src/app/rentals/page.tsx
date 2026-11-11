import PropertyMarketplace, { parsePropertyFilters } from "@/components/public-site/PropertyMarketplace";
import { publicMetadata } from "@/components/public-site/site-metadata";
import "../property-marketplace.css";

export const metadata = publicMetadata(
  "Homes for Rent in Ghana | Rexy Real Estate",
  "Browse verified long-term rental homes in Ghana, filter by city and monthly budget, and enquire about viewings.",
  "/rentals"
);
export const dynamic = "force-dynamic";

export default async function RentalsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <PropertyMarketplace market="rent" filters={parsePropertyFilters(await searchParams)} />;
}

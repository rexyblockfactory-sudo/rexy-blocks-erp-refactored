import type { Metadata } from "next";
import PropertyDetail from "@/components/public-site/PropertyDetail";
import { getPublishedProperty } from "@/components/public-site/property-data";
import { publicMetadata } from "@/components/public-site/site-metadata";
import "../../property-marketplace.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPublishedProperty("rent", slug);
  return property ? publicMetadata(property.title + " | Home for Rent", property.description.slice(0, 160), "/rentals/" + slug)
    : { title: "Rental unavailable" };
}

export default async function RentalDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PropertyDetail market="rent" slug={slug} />;
}

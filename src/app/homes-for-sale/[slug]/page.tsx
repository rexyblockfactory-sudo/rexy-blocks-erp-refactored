import type { Metadata } from "next";
import PropertyDetail from "@/components/public-site/PropertyDetail";
import { getPublishedProperty } from "@/components/public-site/property-data";
import { publicMetadata } from "@/components/public-site/site-metadata";
import "../../property-marketplace.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPublishedProperty("sale", slug);
  return property ? publicMetadata(property.title + " | Home for Sale", property.description.slice(0, 160), "/homes-for-sale/" + slug)
    : { title: "Property not available" };
}

export default async function HomeForSaleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PropertyDetail market="sale" slug={slug} />;
}

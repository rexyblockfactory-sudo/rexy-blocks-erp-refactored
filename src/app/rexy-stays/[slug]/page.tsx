import type { Metadata } from "next";
import PropertyDetail from "@/components/public-site/PropertyDetail";
import { getPublishedProperty } from "@/components/public-site/property-data";
import { publicMetadata } from "@/components/public-site/site-metadata";
import "../../property-marketplace.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPublishedProperty("stay", slug);
  return property ? publicMetadata(property.title + " | Rexy Stays", property.description.slice(0, 160), "/rexy-stays/" + slug)
    : { title: "Stay not available" };
}

export default async function StayDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PropertyDetail market="stay" slug={slug} />;
}

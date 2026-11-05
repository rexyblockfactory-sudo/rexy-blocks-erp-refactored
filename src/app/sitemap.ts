import type { MetadataRoute } from "next";
import { SITE_URL } from "@/components/public-site/site-metadata";
import { getCatalogue, productPath } from "@/components/public-site/catalogue";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getCatalogue();
  return ["/", "/blocks", "/about", "/contact", "/order", "/building-from-abroad", ...products.map(productPath)]
    .map(path => ({ url: `${SITE_URL}${path}` }));
}

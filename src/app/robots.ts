import type { MetadataRoute } from "next";
import { SITE_URL } from "@/components/public-site/site-metadata";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/erp", "/dashboard", "/website-orders", "/login", "/register", "/forget-password", "/update-password", "/inventory", "/production", "/products", "/sales", "/customers", "/invoices", "/expenses", "/financials", "/receivables", "/payroll", "/payments", "/employees", "/reports", "/settings"] }, sitemap: `${SITE_URL}/sitemap.xml` };
}

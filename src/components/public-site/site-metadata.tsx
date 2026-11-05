import type { Metadata } from "next";

export const SITE_URL = "https://rexyblockfactory.com";
export const HERO_IMAGE = "/images/rexy-blocks-hero.png";

export function publicMetadata(title: string, description: string, path: string, image = HERO_IMAGE): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: "Rexy Blocks Factory", locale: "en_GH", type: "website", images: [{ url: image }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

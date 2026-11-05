import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import PublicSiteShell from "@/components/public-site/PublicSiteShell";
import BlockProductVisual, { blockImage } from "@/components/public-site/BlockProductVisual";
import { getCatalogueProduct, productPath, productPrice, type CatalogueProduct } from "@/components/public-site/catalogue";
import { JsonLd, SITE_URL, publicMetadata } from "@/components/public-site/site-metadata";

type ProductPageProps = { params: Promise<{ slug: string }> };

function description(product: CatalogueProduct) {
  return `${product.name} from Rexy Blocks Factory in Kumasi, Ghana. See the current per-block price and request a quotation for pickup or delivery.`;
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getCatalogueProduct(slug);
  return product ? publicMetadata(product.name, description(product), productPath(product), blockImage(product)) : { title: "Block not found" };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getCatalogueProduct(slug);
  if (!product) notFound();
  const path = productPath(product);
  if (`/blocks/${slug}` !== path) permanentRedirect(path);
  const price = Number(product.price);
  const hasPrice = Number.isFinite(price) && price > 0;
  const details = [
    { label: "Type", value: product.category || "Concrete masonry block" },
    { label: "Nominal size", value: product.size || "Confirm with the factory" },
    { label: "Material", value: "Concrete" },
    { label: "Unit", value: "One block" },
  ];
  return <PublicSiteShell><main className="rf-container rf-catalogue">
    <JsonLd data={{ "@context": "https://schema.org", "@type": "Product", name: product.name, description: description(product), image: `${SITE_URL}${blockImage(product)}`, url: `${SITE_URL}${path}`, brand: { "@type": "Brand", name: "Rexy Blocks Factory" }, ...(product.category && { category: product.category }), ...(product.size && { size: product.size }), ...(hasPrice && { offers: { "@type": "Offer", price, priceCurrency: "GHS", url: `${SITE_URL}${path}` } }) }} />
    <nav aria-label="Breadcrumb" className="rf-breadcrumb"><Link href="/blocks">Our blocks</Link><span aria-hidden="true">/</span><span aria-current="page">{product.name}</span></nav>
    <div className="rf-detail-grid"><figure><BlockProductVisual product={product} sizes="(max-width: 800px) 100vw, 50vw"/><figcaption className="rf-image-disclaimer">Digital product illustration. Confirm exact dimensions before ordering.</figcaption></figure>
      <div><p className="rf-eyebrow">REXY CONCRETE BLOCKS</p><h1 className="rf-page-title">{product.name}</h1><p className="rf-detail-price">{productPrice(product.price)} {hasPrice && <small>per block · GHS</small>}</p><p className="rf-detail-copy">Share your quantity and site location for a quote. Our team will confirm availability and any delivery charges.</p>
        <dl className="rf-specs">{details.map(detail => <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}</dl>
        <div className="rf-hero-actions"><Link href={`/order?product=${encodeURIComponent(product.id)}`} className="rf-button rf-button-dark">Request a quote ↗</Link><a href={`${path}/specification.txt`} download className="rf-button rf-button-outline">Download product sheet</a></div>
      </div></div>
    <section className="rf-contact-panel rf-detail-help"><h2>Planning your build?</h2><p>Ask us for exact dimensions, weight and any available test documentation before specifying this block for your project. Pickup and delivery are arranged after we confirm your requirements.</p><Link href="/contact" className="rf-text-link">Talk to the factory ↗</Link></section>
  </main></PublicSiteShell>;
}

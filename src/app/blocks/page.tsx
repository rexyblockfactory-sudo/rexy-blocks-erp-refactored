import Link from "next/link";
import PublicSiteShell from "@/components/public-site/PublicSiteShell";
import ProductCard from "@/components/public-site/ProductCard";
import { getCatalogue } from "@/components/public-site/catalogue";
export const metadata = { title: "Our Concrete Blocks", description: "Explore solid and hollow concrete blocks from Rexy Blocks Factory in Kumasi. See current catalogue prices and request a quotation." };
export default async function BlocksPage() {
  const products = await getCatalogue();
  return <PublicSiteShell><main className="rf-container rf-catalogue"><header className="rf-page-head"><p className="rf-eyebrow">THE REXY COLLECTION</p><h1 className="rf-page-title">The right blocks.<br/>For what comes next.</h1><p>Solid or hollow. 5-inch or 6-inch. Explore the range and tell us what your project needs. Weâ€™ll confirm availability and prepare your quotation.</p></header>{products.length ? <div className="rf-products">{products.map(product=><ProductCard key={product.id} product={product}/>)}</div> : <div className="rf-empty">The catalogue is temporarily unavailable. <Link href="/contact">Contact the factory for current prices â†’</Link></div>}<p className="rf-image-disclaimer">Digital product illustrations, not exact dimensional drawings. Prices are per block; delivery and other agreed charges are quoted separately.</p><div className="rf-contact-panel" style={{marginTop:60}}><h2>Not sure where to start?</h2><p>Share your project details with our team. We can discuss sizes, quantities, pickup and delivery before you place a request.</p><Link href="/contact" className="rf-text-link">Talk to the factory â†—</Link></div></main></PublicSiteShell>;
}

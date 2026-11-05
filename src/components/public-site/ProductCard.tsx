import Link from "next/link";
import BlockProductVisual from "./BlockProductVisual";
import { productPrice, type CatalogueProduct } from "./catalogue";

export default function ProductCard({ product }: { product: CatalogueProduct }) {
  return <article className="rf-product"><Link href={`/order?product=${encodeURIComponent(product.id)}`} aria-label={`Request a quote for ${product.name}`}><BlockProductVisual product={product}/></Link><div className="rf-product-info"><p>{product.category || "Concrete masonry"} · {product.size || "Contact for sizes"}</p><h3>{product.name}</h3><div className="rf-product-bottom"><span className="rf-product-price">{productPrice(product.price)} <small>/ block</small></span><Link href={`/order?product=${encodeURIComponent(product.id)}`} aria-label={`Request a quote for ${product.name}`}>↗</Link></div></div></article>;
}

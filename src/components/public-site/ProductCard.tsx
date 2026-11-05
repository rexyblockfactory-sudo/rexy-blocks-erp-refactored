import Link from "next/link";
import BlockProductVisual from "./BlockProductVisual";
import { productPath, productPrice, type CatalogueProduct } from "./catalogue";

export default function ProductCard({ product }: { product: CatalogueProduct }) {
  const path = productPath(product);
  return <article className="rf-product"><Link href={path} aria-label={`View ${product.name} details`}><BlockProductVisual product={product}/></Link><div className="rf-product-info"><p>{product.category || "Concrete masonry"} · {product.size || "Contact for sizes"}</p><h3><Link href={path}>{product.name}</Link></h3><div className="rf-product-bottom"><span className="rf-product-price">{productPrice(product.price)} <small>/ block</small></span><Link href={path} aria-label={`View ${product.name} details`}>↗</Link></div></div></article>;
}

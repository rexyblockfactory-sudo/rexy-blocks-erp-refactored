import Image from "next/image";
type BlockProduct = { name: string; category?: string | null; size?: string | null };
export function blockVariant(product: BlockProduct) {
  const text = `${product.name} ${product.category ?? ""} ${product.size ?? ""}`.toLowerCase();
  const size = /5[ -]?(inch|in)|five/.test(text) ? "5-inch" : /6[ -]?(inch|in)|six/.test(text) ? "6-inch" : "";
  return { size, type: /hollow/.test(text) ? "hollow" : /solid/.test(text) ? "solid" : "block" };
}
export function blockImage(product: BlockProduct) {
  const { type } = blockVariant(product);
  return type === "hollow" ? "/images/rexy-hollow-block.png" : type === "solid" ? "/images/rexy-solid-block.png" : "/images/rexy-blocks-hero.png";
}

export default function BlockProductVisual({ product, className = "", sizes = "(max-width: 800px) 50vw, 25vw" }: { product: BlockProduct; className?: string; sizes?: string }) {
  const variant = blockVariant(product);
  return <div className={`rf-product-visual ${className}`}><Image src={blockImage(product)} alt={`${product.name} — digital product illustration`} fill sizes={sizes}/><span className="rf-product-badge">{variant.size || "Concrete"} · {variant.type}</span></div>;
}

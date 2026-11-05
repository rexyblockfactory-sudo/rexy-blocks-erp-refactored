import { getCatalogueProduct, productPath, productPrice } from "@/components/public-site/catalogue";
import { SITE_URL } from "@/components/public-site/site-metadata";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getCatalogueProduct(slug);
  if (!product) return new Response("Product not found.", { status: 404 });
  const path = productPath(product);
  const sheet = ["REXY BLOCKS FACTORY | PRODUCT SHEET", "", product.name, `Type: ${product.category || "Concrete masonry block"}`, `Nominal size: ${product.size || "Confirm with the factory"}`, "Material: concrete", `Indicative price per block: ${productPrice(product.price)} (GHS)`, "", "Confirm exact dimensions, weight, availability and any test documentation with the factory before specifying or ordering this product.", "Delivery, pickup arrangements and final price are agreed in the quotation.", "", `Product page: ${SITE_URL}${path}`, "Kumasi, Ghana | +233 54 783 1902 | rexblocksfactory@gmail.com", ""].join("\n");
  return new Response(sheet, { headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="${path.split("/").at(-1)}.txt"`, "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}

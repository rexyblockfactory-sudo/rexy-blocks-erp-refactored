import Link from "next/link";
import ProductTable from "@/components/tables/ProductTable";
import { getProducts } from "@/services/products";
import type { Product } from "@/types/product";

export default async function ProductsPage() {
  const {
    data,
    error,
  } = await getProducts();

  const products =
    (data as Product[]) || [];

  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Products
          </h1>

          <p className="mt-1 text-gray-600">
            Manage your Rexy Blocks products.
          </p>
        </div>

        <Link
          href="/products/add"
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          + Add Product
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          Unable to load products:{" "}
          {error.message}
        </div>
      ) : (
        <ProductTable
          products={products}
        />
      )}
    </main>
  );
}
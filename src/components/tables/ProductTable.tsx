"use client";

import type { Product } from "@/types/product";

interface ProductTableProps {
  products: Product[];
}

export default function ProductTable({
  products,
}: ProductTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg bg-white shadow">
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">
              Product
            </th>

            <th className="p-3 text-left">
              Category
            </th>

            <th className="p-3 text-left">
              Size
            </th>

            <th className="p-3 text-left">
              Selling Price
            </th>
          </tr>
        </thead>

        <tbody>
          {products.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="p-6 text-center text-gray-500"
              >
                No products found.
              </td>
            </tr>
          ) : (
            products.map((product) => (
              <tr
                key={product.id}
                className="border-t"
              >
                <td className="p-3 font-medium">
                  {product.name}
                </td>

                <td className="p-3">
                  {product.category}
                </td>

                <td className="p-3">
                  {product.size}
                </td>

                <td className="p-3">
                  GH₵
                  {Number(
                    product.price
                  ).toLocaleString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
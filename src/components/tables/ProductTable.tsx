"use client";

import { useState } from "react";
import type { Product } from "@/types/product";
import { updateProductPrice } from "@/services/products";

interface ProductTableProps {
  products: Product[];
}

export default function ProductTable({
  products,
}: ProductTableProps) {
  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [editingPrice, setEditingPrice] =
    useState("");

  const [savingId, setSavingId] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  function startEditing(product: Product) {
    setEditingId(product.id);
    setEditingPrice(
      Number(product.price).toFixed(2)
    );
    setError(null);
    setSuccess(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingPrice("");
  }

  async function savePrice(
    product: Product
  ) {
    const price = Number(editingPrice);

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      setError(
        "Please enter a valid price greater than zero."
      );
      return;
    }

    setSavingId(product.id);
    setError(null);
    setSuccess(null);

    const { data, error } =
      await updateProductPrice(
        product.id,
        price
      );

    if (error) {
      setError(error.message);
      setSavingId(null);
      return;
    }

    if (data) {
      product.price = Number(data.price);
    }

    setEditingId(null);
    setEditingPrice("");
    setSavingId(null);

    setSuccess(
      `${product.name} price updated successfully.`
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          {success}
        </div>
      )}

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

              <th className="p-3 text-left">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-6 text-center text-gray-500"
                >
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const isEditing =
                  editingId === product.id;

                const isSaving =
                  savingId === product.id;

                return (
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
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <span>
                            GH₵
                          </span>

                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={editingPrice}
                            onChange={(event) =>
                              setEditingPrice(
                                event.target
                                  .value
                              )
                            }
                            disabled={isSaving}
                            className="w-28 rounded-lg border p-2"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <span>
                          GH₵
                          {Number(
                            product.price
                          ).toLocaleString(
                            "en-GH",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </span>
                      )}
                    </td>

                    <td className="p-3">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              savePrice(product)
                            }
                            disabled={isSaving}
                            className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isSaving
                              ? "Saving..."
                              : "Save"}
                          </button>

                          <button
                            type="button"
                            onClick={
                              cancelEditing
                            }
                            disabled={isSaving}
                            className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            startEditing(
                              product
                            )
                          }
                          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          Edit Price
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
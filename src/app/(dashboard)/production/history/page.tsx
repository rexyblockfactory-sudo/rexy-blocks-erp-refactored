"use client";

import { useEffect, useState } from "react";
import ProductionTable from "@/components/tables/ProductionTable";
import { getProduction } from "@/services/production";
import type { ProductionRecord } from "@/types/production";

export default function ProductionHistoryPage() {
  const [production, setProduction] =
    useState<ProductionRecord[]>([]);

  const [totalBlocks, setTotalBlocks] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadProduction() {
      setLoading(true);
      setError(null);

      const {
        data,
        error: productionError,
      } = await getProduction();

      if (productionError) {
        console.error(
          "Production history error:",
          productionError
        );

        setError(
          productionError.message
        );

        setLoading(false);
        return;
      }

      const productionData =
        (data as ProductionRecord[]) || [];

      const total =
        productionData.reduce(
          (sum, item) =>
            sum + Number(item.quantity),
          0
        );

      setProduction(productionData);
      setTotalBlocks(total);
      setLoading(false);
    }

    loadProduction();
  }, []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">
          Production History
        </h1>

        <p className="mt-1 text-gray-600">
          View all recorded production.
        </p>
      </div>

      <div className="rounded-lg bg-blue-600 p-6 text-white">
        <p className="text-sm">
          Total Blocks Produced
        </p>

        <h2 className="text-3xl font-bold">
          {totalBlocks.toLocaleString()}
        </h2>
      </div>

      {loading ? (
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-gray-500">
            Loading production history...
          </p>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          Unable to load production history:{" "}
          {error}
        </div>
      ) : (
        <ProductionTable
          records={production}
        />
      )}
    </main>
  );
}
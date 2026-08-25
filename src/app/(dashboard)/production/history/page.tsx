"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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

  const loadProduction = useCallback(
    async () => {
      setLoading(true);
      setError(null);

      try {
        const {
          data,
          error: productionError,
        } = await getProduction();

        if (productionError) {
          console.error(
            "Production history error:",
            productionError
          );

          setProduction([]);
          setTotalBlocks(0);

          setError(
            productionError.message
          );

          return;
        }

        const productionData =
          Array.isArray(data)
            ? data
            : [];

        console.log(
          "Production history loaded:",
          productionData
        );

        const total =
          productionData.reduce(
            (sum, item) =>
              sum +
              Number(item.quantity ?? 0),
            0
          );

        setProduction(
          productionData as ProductionRecord[]
        );

        setTotalBlocks(total);
      } catch (err) {
        console.error(
          "Unexpected production history error:",
          err
        );

        setProduction([]);
        setTotalBlocks(0);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load production history."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadProduction();
  }, [loadProduction]);

  return (
    <main className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Production History
          </h1>

          <p className="mt-1 text-gray-600">
            View all recorded production.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={loadProduction}
            disabled={loading}
            className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>

          <Link
            href="/production"
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            New Production
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-blue-600 p-6 text-white">
          <p className="text-sm">
            Total Blocks Produced
          </p>

          <h2 className="mt-1 text-3xl font-bold">
            {totalBlocks.toLocaleString(
              "en-GH"
            )}
          </h2>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Production Batches
          </p>

          <h2 className="mt-1 text-3xl font-bold">
            {production.length.toLocaleString(
              "en-GH"
            )}
          </h2>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-gray-500">
            Loading production history...
          </p>
        </div>
      ) : error ? (
        /* Error */
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-semibold">
            Unable to load production history.
          </p>

          <p className="mt-1 text-sm">
            {error}
          </p>

          <button
            type="button"
            onClick={loadProduction}
            className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-red-100"
          >
            Try Again
          </button>
        </div>
      ) : production.length === 0 ? (
        /* Empty */
        <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold">
            No Production History
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            No production records were returned
            from the database.
          </p>

          <p className="mt-1 text-xs text-gray-400">
            If you know production records exist,
            check the browser console for the
            loaded production response.
          </p>

          <Link
            href="/production"
            className="mt-5 inline-flex rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Record Production
          </Link>
        </div>
      ) : (
        /* Production Table */
        <ProductionTable
          records={production}
        />
      )}
    </main>
  );
}
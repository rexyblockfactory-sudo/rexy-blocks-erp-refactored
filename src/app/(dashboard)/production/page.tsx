"use client";

import Link from "next/link";
import ProductionForm from "@/components/forms/ProductionForm";

export default function ProductionPage() {
  return (
    <main className="space-y-8 p-6">
      {/* ========================================================
          HEADER
      ======================================================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Production
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Record and manage block production for
            Rexy Blocks Factory.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/production"
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            New Production
          </Link>

          <Link
            href="/production/history"
            className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Production History
          </Link>
        </div>
      </div>

      {/* ========================================================
          QUICK NAVIGATION
      ======================================================== */}
      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href="/production"
          className="group rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">
                New Production
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Record a new batch of blocks and
                material usage.
              </p>
            </div>

            <span className="text-2xl transition-transform group-hover:translate-x-1">
              →
            </span>
          </div>
        </Link>

        <Link
          href="/production/history"
          className="group rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">
                Production History
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                View previous production batches,
                quantities, materials, and costs.
              </p>
            </div>

            <span className="text-2xl transition-transform group-hover:translate-x-1">
              →
            </span>
          </div>
        </Link>
      </section>

      {/* ========================================================
          PRODUCTION FORM
      ======================================================== */}
      <section>
        <ProductionForm />
      </section>
    </main>
  );
}
"use client";

import Link from "next/link";
import SalesForm from "@/components/forms/SalesForm";

export default function NewSalePage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            New Sale
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Record a new sale for Rexy Blocks Factory.
          </p>
        </div>

        <Link
          href="/sales"
          className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
        >
          Back to Sales
        </Link>
      </div>

      {/* Sale Form */}
      <section>
        <SalesForm />
      </section>
    </main>
  );
}
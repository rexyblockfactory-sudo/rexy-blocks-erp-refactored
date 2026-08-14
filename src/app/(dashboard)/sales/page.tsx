"use client";

import SalesForm from "@/components/forms/SalesForm";

export default function SalesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Sales</h1>

      <p className="text-gray-600">
        Record customer sales and payments.
      </p>

      <SalesForm />
    </div>
  );
}
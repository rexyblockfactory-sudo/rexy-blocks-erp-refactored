import Link from "next/link";
import CustomerTable from "@/components/tables/CustomerTable";
import { getCustomers } from "@/services/customers";
import type { Customer } from "@/types/customer";

export default async function CustomersPage() {
  const {
    data,
    error,
  } = await getCustomers();

  const customers =
    (data as Customer[]) || [];

  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Customers
          </h1>

          <p className="mt-1 text-gray-600">
            Manage your Rexy Blocks Factory customers.
          </p>
        </div>

        <Link
          href="/customers/add"
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          + Add Customer
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          Unable to load customers:{" "}
          {error.message}
        </div>
      ) : (
        <CustomerTable
          customers={customers}
        />
      )}
    </main>
  );
}
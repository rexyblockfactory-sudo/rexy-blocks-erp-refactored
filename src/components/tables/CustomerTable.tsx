"use client";

import Link from "next/link";
import type { Customer } from "@/types/customer";

interface CustomerTableProps {
  customers: Customer[];
}

function money(value: number) {
  return `GH₵${value.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CustomerTable({
  customers,
}: CustomerTableProps) {
  if (customers.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-10 text-center text-gray-500 shadow-sm">
        No customers found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="p-4 text-left">
              Customer
            </th>

            <th className="p-4 text-left">
              Phone
            </th>

            <th className="p-4 text-left">
              Address
            </th>

            <th className="p-4 text-left">
              Type
            </th>

            <th className="p-4 text-right">
              Balance
            </th>

            <th className="p-4 text-right">
              Account
            </th>
          </tr>
        </thead>

        <tbody>
          {customers.map((customer) => {
            const balance = Number(
              customer.balance ?? 0
            );

            return (
              <tr
                key={customer.id}
                className="border-b last:border-0 hover:bg-gray-50"
              >
                <td className="p-4 font-medium">
                  {customer.customer_name}
                </td>

                <td className="p-4">
                  {customer.phone || "—"}
                </td>

                <td className="p-4">
                  {customer.address || "—"}
                </td>

                <td className="p-4">
                  {customer.customer_type || "—"}
                </td>

                <td
                  className={`p-4 text-right font-semibold ${
                    balance > 0
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {money(balance)}
                </td>

                <td className="p-4 text-right">
                  <Link
                    href={`/customers/${customer.id}`}
                    className="rounded-lg bg-blue-600 px-3 py-2 font-medium text-white hover:bg-blue-700"
                  >
                    View Account
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
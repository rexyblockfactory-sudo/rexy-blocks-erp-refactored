"use client";

import type { Customer } from "@/types/customer";

interface CustomerTableProps {
  customers: Customer[];
}

export default function CustomerTable({
  customers,
}: CustomerTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg bg-white shadow">
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">
              Customer
            </th>

            <th className="p-3 text-left">
              Phone
            </th>

            <th className="p-3 text-left">
              Address
            </th>

            <th className="p-3 text-left">
              Type
            </th>

            <th className="p-3 text-left">
              Balance
            </th>
          </tr>
        </thead>

        <tbody>
          {customers.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="p-6 text-center text-gray-500"
              >
                No customers found.
              </td>
            </tr>
          ) : (
            customers.map((customer) => (
              <tr
                key={customer.id}
                className="border-t"
              >
                <td className="p-3 font-medium">
                  {customer.customer_name}
                </td>

                <td className="p-3">
                  {customer.phone || "-"}
                </td>

                <td className="p-3">
                  {customer.address || "-"}
                </td>

                <td className="p-3">
                  {customer.customer_type || "-"}
                </td>

                <td className="p-3">
                  GH₵
                  {Number(
                    customer.balance || 0
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
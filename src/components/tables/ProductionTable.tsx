"use client";

import type { ProductionRecord } from "@/types/production";

interface ProductionTableProps {
  records: ProductionRecord[];
}

export default function ProductionTable({
  records,
}: ProductionTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg bg-white shadow">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b bg-gray-100">
            <th className="p-3 text-left">
              Product
            </th>

            <th className="p-3 text-left">
              Quantity
            </th>

            <th className="p-3 text-left">
              Cement
            </th>

            <th className="p-3 text-left">
              Sand
            </th>

            <th className="p-3 text-left">
              Quarry Dust
            </th>

            <th className="p-3 text-left">
              Water
            </th>

            <th className="p-3 text-left">
              Date
            </th>
          </tr>
        </thead>

        <tbody>
          {records.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="p-6 text-center text-gray-500"
              >
                No production records found.
              </td>
            </tr>
          ) : (
            records.map((item) => (
              <tr
                key={item.id}
                className="border-b"
              >
                <td className="p-3">
                  {item.product_name}
                </td>

                <td className="p-3">
                  {item.quantity}
                </td>

                <td className="p-3">
                  {item.cement_used ?? 0}
                </td>

                <td className="p-3">
                  {item.sand_used ?? 0}
                </td>

                <td className="p-3">
                  {item.quarry_dust_used ?? 0}
                </td>

                <td className="p-3">
                  {item.water_used ?? 0}
                </td>

                <td className="p-3">
                  {new Date(
                    item.created_at
                  ).toLocaleDateString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
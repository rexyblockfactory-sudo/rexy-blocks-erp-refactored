"use client";

import type { InventoryItem } from "@/types/inventory";

interface InventoryTableProps {
  items: InventoryItem[];
}

export default function InventoryTable({
  items,
}: InventoryTableProps) {
  const totalValue = items.reduce(
    (sum, item) =>
      sum +
      Number(item.quantity) *
        Number(item.unit_cost),
    0
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-sm text-gray-500">
          Total Inventory Value
        </h2>

        <p className="mt-2 text-3xl font-bold">
          GH₵{totalValue.toLocaleString()}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">
                Item
              </th>

              <th className="p-3 text-left">
                Category
              </th>

              <th className="p-3 text-left">
                Unit
              </th>

              <th className="p-3 text-left">
                Quantity
              </th>

              <th className="p-3 text-left">
                Unit Cost
              </th>

              <th className="p-3 text-left">
                Total Value
              </th>

              <th className="p-3 text-left">
                Date
              </th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-6 text-center text-gray-500"
                >
                  No inventory records found.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const itemValue =
                  Number(item.quantity) *
                  Number(item.unit_cost);

                return (
                  <tr
                    key={item.id}
                    className="border-t"
                  >
                    <td className="p-3 font-medium">
                      {item.item_name}
                    </td>

                    <td className="p-3">
                      {item.category}
                    </td>

                    <td className="p-3">
                      {item.unit}
                    </td>

                    <td className="p-3">
                      {Number(
                        item.quantity
                      ).toLocaleString()}
                    </td>

                    <td className="p-3">
                      GH₵
                      {Number(
                        item.unit_cost
                      ).toLocaleString()}
                    </td>

                    <td className="p-3 font-medium">
                      GH₵
                      {itemValue.toLocaleString()}
                    </td>

                    <td className="p-3">
                      {new Date(
                        item.created_at
                      ).toLocaleDateString()}
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
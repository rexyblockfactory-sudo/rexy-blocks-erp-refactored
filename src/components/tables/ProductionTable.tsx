"use client";

import type { Production } from "@/types/production";

type ProductionTableProps = {
  records: Production[];
  loading?: boolean;
};

function formatNumber(
  value: number | null | undefined,
  decimals = 2
): string {
  const number = Number(value ?? 0);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toLocaleString("en-GH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatDate(
  value: string | null | undefined
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ProductionTable({
  records,
  loading = false,
}: ProductionTableProps) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1400px] w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                {[
                  "Date",
                  "Product",
                  "Quantity",
                  "Cement",
                  "Chippings",
                  "Quarry Dust",
                  "Water",
                  "Total Cost",
                  "Cost / Block",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="whitespace-nowrap p-3 text-left font-semibold"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {Array.from({ length: 5 }).map(
                (_, row) => (
                  <tr
                    key={row}
                    className="border-b"
                  >
                    {Array.from({
                      length: 9,
                    }).map((_, column) => (
                      <td
                        key={column}
                        className="p-3"
                      >
                        <div className="h-4 animate-pulse rounded bg-gray-200" />
                      </td>
                    ))}
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!records || records.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
        <h3 className="font-semibold">
          No production records
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Production records will appear here
          after production is recorded.
        </p>
      </div>
    );
  }

  const totalQuantity = records.reduce(
    (total, record) =>
      total + Number(record.quantity ?? 0),
    0
  );

  const totalCement = records.reduce(
    (total, record) =>
      total +
      Number(record.cement_used ?? 0),
    0
  );

  const totalChippings = records.reduce(
    (total, record) =>
      total +
      Number(record.chippings_used ?? 0),
    0
  );

  const totalQuarryDust = records.reduce(
    (total, record) =>
      total +
      Number(record.quarry_dust_used ?? 0),
    0
  );

  const totalWater = records.reduce(
    (total, record) =>
      total +
      Number(record.water_used ?? 0),
    0
  );

  const totalProductionCost =
    records.reduce(
      (total, record) =>
        total +
        Number(
          record.total_production_cost ?? 0
        ),
      0
    );

  const weightedCostPerBlock =
    totalQuantity > 0
      ? totalProductionCost /
        totalQuantity
      : 0;

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      {/* Header */}
      <div className="border-b px-4 py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">
              Production Records
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Detailed production batches and
              production costs.
            </p>
          </div>

          <div className="text-sm text-gray-500">
            {records.length.toLocaleString(
              "en-GH"
            )}{" "}
            {records.length === 1
              ? "batch"
              : "batches"}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-[1400px] w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="whitespace-nowrap p-3 text-left font-semibold">
                Date
              </th>

              <th className="whitespace-nowrap p-3 text-left font-semibold">
                Product
              </th>

              <th className="whitespace-nowrap p-3 text-right font-semibold">
                Quantity
              </th>

              <th className="whitespace-nowrap p-3 text-right font-semibold">
                Cement
              </th>

              <th className="whitespace-nowrap p-3 text-right font-semibold">
                Chippings
              </th>

              <th className="whitespace-nowrap p-3 text-right font-semibold">
                Quarry Dust
              </th>

              <th className="whitespace-nowrap p-3 text-right font-semibold">
                Water
              </th>

              <th className="whitespace-nowrap p-3 text-right font-semibold">
                Cement Cost
              </th>

              <th className="whitespace-nowrap p-3 text-right font-semibold">
                Chippings Cost
              </th>

              <th className="whitespace-nowrap p-3 text-right font-semibold">
                Quarry Dust Cost
              </th>

              <th className="whitespace-nowrap p-3 text-right font-semibold">
                Water Cost
              </th>

              <th className="whitespace-nowrap p-3 text-right font-semibold">
                Total Cost
              </th>

              <th className="whitespace-nowrap p-3 text-right font-semibold">
                Cost / Block
              </th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {records.map((record) => (
              <tr
                key={record.id}
                className="hover:bg-gray-50"
              >
                {/* Date */}
                <td className="whitespace-nowrap p-3 text-gray-600">
                  {formatDate(
                    record.created_at
                  )}
                </td>

                {/* Product */}
                <td className="whitespace-nowrap p-3 font-medium">
                  {record.product_name}
                </td>

                {/* Quantity */}
                <td className="whitespace-nowrap p-3 text-right font-semibold">
                  {formatNumber(
                    record.quantity,
                    0
                  )}
                </td>

                {/* Cement */}
                <td className="whitespace-nowrap p-3 text-right">
                  {formatNumber(
                    record.cement_used
                  )}{" "}
                  bag
                </td>

                {/* Chippings */}
                <td className="whitespace-nowrap p-3 text-right">
                  {formatNumber(
                    record.chippings_used
                  )}{" "}
                  m³
                </td>

                {/* Quarry Dust */}
                <td className="whitespace-nowrap p-3 text-right">
                  {formatNumber(
                    record.quarry_dust_used
                  )}{" "}
                  m³
                </td>

                {/* Water */}
                <td className="whitespace-nowrap p-3 text-right">
                  {formatNumber(
                    record.water_used
                  )}{" "}
                  L
                </td>

                {/* Cement Cost */}
                <td className="whitespace-nowrap p-3 text-right">
                  GH₵
                  {formatNumber(
                    record.cement_cost
                  )}
                </td>

                {/* Chippings Cost */}
                <td className="whitespace-nowrap p-3 text-right">
                  GH₵
                  {formatNumber(
                    record.chippings_cost
                  )}
                </td>

                {/* Quarry Dust Cost */}
                <td className="whitespace-nowrap p-3 text-right">
                  GH₵
                  {formatNumber(
                    record.quarry_dust_cost
                  )}
                </td>

                {/* Water Cost */}
                <td className="whitespace-nowrap p-3 text-right">
                  GH₵
                  {formatNumber(
                    record.water_cost
                  )}
                </td>

                {/* Total Cost */}
                <td className="whitespace-nowrap p-3 text-right font-semibold">
                  GH₵
                  {formatNumber(
                    record.total_production_cost
                  )}
                </td>

                {/* Cost Per Block */}
                <td className="whitespace-nowrap p-3 text-right font-semibold">
                  GH₵
                  {formatNumber(
                    record.cost_per_block
                  )}
                </td>
              </tr>
            ))}
          </tbody>

          {/* Totals */}
          <tfoot className="border-t bg-gray-50">
            <tr>
              <td
                colSpan={2}
                className="whitespace-nowrap p-3 font-bold"
              >
                Total
              </td>

              <td className="whitespace-nowrap p-3 text-right font-bold">
                {formatNumber(
                  totalQuantity,
                  0
                )}
              </td>

              <td className="whitespace-nowrap p-3 text-right font-semibold">
                {formatNumber(
                  totalCement
                )}{" "}
                bags
              </td>

              <td className="whitespace-nowrap p-3 text-right font-semibold">
                {formatNumber(
                  totalChippings
                )}{" "}
                m³
              </td>

              <td className="whitespace-nowrap p-3 text-right font-semibold">
                {formatNumber(
                  totalQuarryDust
                )}{" "}
                m³
              </td>

              <td className="whitespace-nowrap p-3 text-right font-semibold">
                {formatNumber(
                  totalWater
                )}{" "}
                L
              </td>

              <td className="p-3 text-right">
                —
              </td>

              <td className="p-3 text-right">
                —
              </td>

              <td className="p-3 text-right">
                —
              </td>

              <td className="p-3 text-right">
                —
              </td>

              <td className="whitespace-nowrap p-3 text-right font-bold">
                GH₵
                {formatNumber(
                  totalProductionCost
                )}
              </td>

              <td className="whitespace-nowrap p-3 text-right font-bold">
                GH₵
                {formatNumber(
                  weightedCostPerBlock
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t bg-gray-50 px-4 py-3 text-xs text-gray-500">
        Total production:{" "}
        <span className="font-semibold text-gray-700">
          {formatNumber(
            totalQuantity,
            0
          )}{" "}
          blocks
        </span>
        {" • "}
        Total production cost:{" "}
        <span className="font-semibold text-gray-700">
          GH₵
          {formatNumber(
            totalProductionCost
          )}
        </span>
        {" • "}
        Weighted cost per block:{" "}
        <span className="font-semibold text-gray-700">
          GH₵
          {formatNumber(
            weightedCostPerBlock
          )}
        </span>
      </div>
    </div>
  );
}
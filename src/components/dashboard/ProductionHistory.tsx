"use client";

import type { DashboardProductionRecord } from "@/types/dashboard";

type ProductionHistoryProps = {
  records: DashboardProductionRecord[];
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

function getNumber(
  record: DashboardProductionRecord,
  field: keyof DashboardProductionRecord
): number {
  const value = Number(record[field] ?? 0);

  return Number.isFinite(value) ? value : 0;
}

export default function ProductionHistory({
  records,
  loading = false,
}: ProductionHistoryProps) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
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
                      length: 7,
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
          No production history
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Production batches will appear here
          after production is recorded.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="border-b px-4 py-4">
        <h2 className="font-semibold">
          Production History
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Recent production batches and material
          usage.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full text-sm">
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
            </tr>
          </thead>

          <tbody className="divide-y">
            {records.map((record) => (
              <tr
                key={record.id}
                className="hover:bg-gray-50"
              >
                <td className="whitespace-nowrap p-3 text-gray-600">
                  {formatDate(
                    record.created_at
                  )}
                </td>

                <td className="whitespace-nowrap p-3 font-medium">
                  {record.product_name}
                </td>

                <td className="whitespace-nowrap p-3 text-right font-semibold">
                  {formatNumber(
                    getNumber(
                      record,
                      "quantity"
                    ),
                    0
                  )}
                </td>

                <td className="whitespace-nowrap p-3 text-right">
                  {formatNumber(
                    getNumber(
                      record,
                      "cement_used"
                    )
                  )}{" "}
                  bag
                </td>

                <td className="whitespace-nowrap p-3 text-right">
                  {formatNumber(
                    getNumber(
                      record,
                      "chippings_used"
                    )
                  )}{" "}
                  m³
                </td>

                <td className="whitespace-nowrap p-3 text-right">
                  {formatNumber(
                    getNumber(
                      record,
                      "quarry_dust_used"
                    )
                  )}{" "}
                  m³
                </td>

                <td className="whitespace-nowrap p-3 text-right">
                  {formatNumber(
                    getNumber(
                      record,
                      "water_used"
                    )
                  )}{" "}
                  L
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot className="border-t bg-gray-50">
            <tr>
              <td
                colSpan={2}
                className="p-3 font-bold"
              >
                Total
              </td>

              <td className="p-3 text-right font-bold">
                {formatNumber(
                  records.reduce(
                    (total, record) =>
                      total +
                      getNumber(
                        record,
                        "quantity"
                      ),
                    0
                  ),
                  0
                )}
              </td>

              <td className="p-3 text-right font-semibold">
                {formatNumber(
                  records.reduce(
                    (total, record) =>
                      total +
                      getNumber(
                        record,
                        "cement_used"
                      ),
                    0
                  )
                )}
              </td>

              <td className="p-3 text-right font-semibold">
                {formatNumber(
                  records.reduce(
                    (total, record) =>
                      total +
                      getNumber(
                        record,
                        "chippings_used"
                      ),
                    0
                  )
                )}
              </td>

              <td className="p-3 text-right font-semibold">
                {formatNumber(
                  records.reduce(
                    (total, record) =>
                      total +
                      getNumber(
                        record,
                        "quarry_dust_used"
                      ),
                    0
                  )
                )}
              </td>

              <td className="p-3 text-right font-semibold">
                {formatNumber(
                  records.reduce(
                    (total, record) =>
                      total +
                      getNumber(
                        record,
                        "water_used"
                      ),
                    0
                  )
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="border-t bg-gray-50 px-4 py-3 text-xs text-gray-500">
        Showing{" "}
        <span className="font-semibold text-gray-700">
          {records.length}
        </span>{" "}
        {records.length === 1
          ? "production batch"
          : "production batches"}.
      </div>
    </div>
  );
}
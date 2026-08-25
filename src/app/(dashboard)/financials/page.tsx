"use client";

import { useEffect, useState } from "react";
import {
  getFinancialSummary,
} from "@/services/financials";
import type {
  FinancialSummary,
} from "@/types/financials";

type Period =
  | "all"
  | "today"
  | "week"
  | "month"
  | "year"
  | "custom";

function money(value: number) {
  return `GH₵${value.toLocaleString(
    "en-GH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function localDateString(
  date: Date
) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPeriodRange(
  period: Period,
  customStart: string,
  customEnd: string
) {
  const now = new Date();

  if (period === "all") {
    return {};
  }

  if (period === "custom") {
    if (!customStart || !customEnd) {
      return {};
    }

    const end = new Date(
      `${customEnd}T00:00:00`
    );

    end.setDate(
      end.getDate() + 1
    );

    return {
      startDate: customStart,
      endDate: localDateString(end),
    };
  }

  if (period === "today") {
    const today =
      localDateString(now);

    const tomorrow =
      new Date(now);

    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    return {
      startDate: today,
      endDate:
        localDateString(tomorrow),
    };
  }

  if (period === "week") {
    const start =
      new Date(now);

    const day =
      start.getDay();

    const difference =
      day === 0 ? 6 : day - 1;

    start.setDate(
      start.getDate() - difference
    );

    const end =
      new Date(start);

    end.setDate(
      end.getDate() + 7
    );

    return {
      startDate:
        localDateString(start),
      endDate:
        localDateString(end),
    };
  }

  if (period === "month") {
    const start =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );

    const end =
      new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1
      );

    return {
      startDate:
        localDateString(start),
      endDate:
        localDateString(end),
    };
  }

  if (period === "year") {
    const start =
      new Date(
        now.getFullYear(),
        0,
        1
      );

    const end =
      new Date(
        now.getFullYear() + 1,
        0,
        1
      );

    return {
      startDate:
        localDateString(start),
      endDate:
        localDateString(end),
    };
  }

  return {};
}

function MetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>

      {description && (
        <p className="mt-1 text-sm text-gray-500">
          {description}
        </p>
      )}
    </div>
  );
}

export default function FinancialsPage() {
  const [data, setData] =
    useState<FinancialSummary | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [period, setPeriod] =
    useState<Period>("all");

  const [customStart, setCustomStart] =
    useState("");

  const [customEnd, setCustomEnd] =
    useState("");

  async function loadFinancials() {
    setLoading(true);
    setError("");

    const range =
      getPeriodRange(
        period,
        customStart,
        customEnd
      );

    if (
      period === "custom" &&
      (!customStart ||
        !customEnd)
    ) {
      setLoading(false);
      return;
    }

    const result =
      await getFinancialSummary(
        range
      );

    if (result.error) {
      console.error(
        "Financial dashboard error:",
        result.error
      );

      setError(
        result.error.message
      );

      setLoading(false);
      return;
    }

    setData(result.data);
    setLoading(false);
  }

  useEffect(() => {
    loadFinancials();
  }, [
    period,
    customStart,
    customEnd,
  ]);

  return (
    <main className="space-y-8 p-6">

      {/* Header */}

      <div>
        <h1 className="text-3xl font-bold">
          Financial Dashboard
        </h1>

        <p className="mt-1 text-gray-600">
          Rexy Blocks Factory financial overview.
        </p>
      </div>


      {/* Period Filter */}

      <section className="rounded-xl border bg-white p-5 shadow-sm">

        <div className="flex flex-col gap-4">

          <div>
            <h2 className="font-semibold">
              Reporting Period
            </h2>

            <p className="text-sm text-gray-500">
              Revenue, COGS, gross profit and
              expenses are filtered by transaction date.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">

            {[
              ["all", "All Time"],
              ["today", "Today"],
              ["week", "This Week"],
              ["month", "This Month"],
              ["year", "This Year"],
              ["custom", "Custom"],
            ].map(
              ([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setPeriod(
                      value as Period
                    )
                  }
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${
                    period === value
                      ? "bg-blue-600 text-white"
                      : "border bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              )
            )}

          </div>


          {period === "custom" && (
            <div className="grid gap-4 md:grid-cols-2">

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Start Date
                </label>

                <input
                  type="date"
                  value={customStart}
                  onChange={(e) =>
                    setCustomStart(
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  End Date
                </label>

                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) =>
                    setCustomEnd(
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border p-3"
                />
              </div>

            </div>
          )}

        </div>

      </section>


      {loading && (
        <div className="rounded-lg border bg-white p-6">
          Loading financial information...
        </div>
      )}


      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}


      {!loading &&
        !error &&
        data && (
          <>

            {/* Revenue */}

            <section>
              <h2 className="mb-4 text-xl font-semibold">
                Revenue & Receivables
              </h2>

              <div className="grid gap-4 md:grid-cols-3">

                <MetricCard
                  title="Total Revenue"
                  value={money(
                    data.totalRevenue
                  )}
                />

                <MetricCard
                  title="Payments Collected"
                  value={money(
                    data.totalPaid
                  )}
                  description="Payments actually recorded during the selected period."
                />

                <MetricCard
                  title="Current Accounts Receivable"
                  value={money(
                    data.totalReceivable
                  )}
                  description="Current outstanding customer balances."
                />

              </div>
            </section>


            {/* Profitability */}

            <section>
              <h2 className="mb-4 text-xl font-semibold">
                Profitability
              </h2>

              <div className="grid gap-4 md:grid-cols-4">

                <MetricCard
                  title="Known COGS"
                  value={money(
                    data.totalCogs
                  )}
                  description="Sales with recorded production cost."
                />

                <MetricCard
                  title="Known Gross Profit"
                  value={money(
                    data.totalGrossProfit
                  )}
                />

                <MetricCard
                  title="Operating Expenses"
                  value={money(
                    data.totalExpenses
                  )}
                />

                <MetricCard
                  title="Known Net Profit"
                  value={money(
                    data.knownNetProfit
                  )}
                  description="Known gross profit minus recorded expenses."
                />

              </div>
            </section>


            {/* Cost Warning */}

            {data.salesWithUnknownCost >
              0 && (
              <section>
                <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-5">

                  <h2 className="font-semibold text-yellow-900">
                    Historical Cost Data Incomplete
                  </h2>

                  <p className="mt-2 text-sm text-yellow-800">
                    {
                      data.salesWithUnknownCost
                    }{" "}
                    sales in this period do not
                    have recorded COGS.
                  </p>

                  <p className="mt-2 text-sm text-yellow-800">
                    Their actual gross profit
                    cannot currently be determined.
                    They are not treated as zero-cost
                    sales.
                  </p>

                </div>
              </section>
            )}


            {/* Finished Goods */}

            <section>
              <h2 className="mb-4 text-xl font-semibold">
                Current Finished Goods
              </h2>

              <div className="grid gap-4 md:grid-cols-3">

                <MetricCard
                  title="Physical Finished Goods"
                  value={data.totalFinishedGoods.toLocaleString()}
                  description="Current physical block inventory."
                />

                <MetricCard
                  title="Costed Finished Goods"
                  value={data.costedFinishedGoods.toLocaleString()}
                  description="Current blocks with known production cost."
                />

                <MetricCard
                  title="Known Finished Goods Value"
                  value={money(
                    data.finishedGoodsValue
                  )}
                  description="Current value of costed finished goods."
                />

              </div>
            </section>


            {/* Accounting Note */}

            <section>
              <div className="rounded-xl border bg-gray-50 p-5">

                <h2 className="font-semibold">
                  Accounting Status
                </h2>

                <p className="mt-2 text-sm text-gray-600">
                  Profitability is reported on a
                  known-cost basis. Historical sales
                  without production-cost records are
                  excluded from COGS rather than being
                  incorrectly treated as zero-cost sales.
                </p>

              </div>
            </section>

          </>
        )}

    </main>
  );
}
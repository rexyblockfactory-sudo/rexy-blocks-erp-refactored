"use client";

import { useEffect, useState } from "react";
import { getFinancialSummary } from "@/services/financials";
import type { FinancialSummary } from "@/types/financials";

type Period =
  | "all"
  | "today"
  | "week"
  | "month"
  | "year"
  | "custom";

function money(value: number) {
  return `GH₵${Number(value || 0).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function localDateString(date: Date) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

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

    const end = new Date(`${customEnd}T00:00:00`);

    end.setDate(end.getDate() + 1);

    return {
      startDate: customStart,
      endDate: localDateString(end),
    };
  }

  if (period === "today") {
    const today = localDateString(now);

    const tomorrow = new Date(now);

    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      startDate: today,
      endDate: localDateString(tomorrow),
    };
  }

  if (period === "week") {
    const start = new Date(now);

    const day = start.getDay();

    const difference = day === 0 ? 6 : day - 1;

    start.setDate(start.getDate() - difference);

    const end = new Date(start);

    end.setDate(end.getDate() + 7);

    return {
      startDate: localDateString(start),
      endDate: localDateString(end),
    };
  }

  if (period === "month") {
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    );

    return {
      startDate: localDateString(start),
      endDate: localDateString(end),
    };
  }

  if (period === "year") {
    const start = new Date(
      now.getFullYear(),
      0,
      1
    );

    const end = new Date(
      now.getFullYear() + 1,
      0,
      1
    );

    return {
      startDate: localDateString(start),
      endDate: localDateString(end),
    };
  }

  return {};
}

function ReportRow({
  label,
  value,
  bold = false,
  border = false,
  negative = false,
}: {
  label: string;
  value: number;
  bold?: boolean;
  border?: boolean;
  negative?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-3 ${
        border ? "border-t" : ""
      }`}
    >
      <span
        className={
          bold
            ? "font-semibold text-gray-900"
            : "text-gray-700"
        }
      >
        {label}
      </span>

      <span
        className={`font-mono ${
          bold ? "font-bold" : ""
        } ${
          negative
            ? "text-red-600"
            : "text-gray-900"
        }`}
      >
        {negative ? "-" : ""}
        {money(Math.abs(value))}
      </span>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  positive,
}: {
  title: string;
  value: string;
  description: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">
        {title}
      </p>

      <p
        className={`mt-2 text-2xl font-bold ${
          positive === true
            ? "text-green-700"
            : positive === false
              ? "text-red-700"
              : "text-gray-900"
        }`}
      >
        {value}
      </p>

      <p className="mt-1 text-sm text-gray-500">
        {description}
      </p>
    </div>
  );
}

export default function ProfitLossPage() {
  const [data, setData] =
    useState<FinancialSummary | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [period, setPeriod] =
    useState<Period>("month");

  const [customStart, setCustomStart] =
    useState("");

  const [customEnd, setCustomEnd] =
    useState("");

  async function loadReport() {
    setLoading(true);
    setError("");

    const range = getPeriodRange(
      period,
      customStart,
      customEnd
    );

    if (
      period === "custom" &&
      (!customStart || !customEnd)
    ) {
      setLoading(false);
      return;
    }

    const result =
      await getFinancialSummary(range);

    if (result.error) {
      console.error(
        "Profit & Loss error:",
        result.error
      );

      setError(result.error.message);
      setLoading(false);
      return;
    }

    setData(result.data);
    setLoading(false);
  }

  useEffect(() => {
    loadReport();
  }, [
    period,
    customStart,
    customEnd,
  ]);

  const revenue =
    Number(data?.totalRevenue || 0);

  const cogs =
    Number(data?.totalCogs || 0);

  const grossProfit =
    Number(data?.totalGrossProfit || 0);

  const expenses =
    Number(data?.totalExpenses || 0);

  const netProfit =
    Number(data?.knownNetProfit || 0);

  const grossMargin =
    revenue > 0
      ? (grossProfit / revenue) * 100
      : 0;

  const netMargin =
    revenue > 0
      ? (netProfit / revenue) * 100
      : 0;

  return (
    <main className="space-y-8 p-6">

      {/* HEADER */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:flex-row">
        <div>
          <h1 className="text-3xl font-bold">
            Profit & Loss
          </h1>

          <p className="mt-1 text-gray-600">
            Rexy Blocks Factory profit and loss
            statement.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50 print:hidden"
        >
          Print Report
        </button>
      </div>

      {/* PERIOD */}

      <section className="rounded-xl border bg-white p-5 shadow-sm print:hidden">
        <h2 className="font-semibold">
          Reporting Period
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Select the period for the Profit &
          Loss statement.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["all", "All Time"],
            ["today", "Today"],
            ["week", "This Week"],
            ["month", "This Month"],
            ["year", "This Year"],
            ["custom", "Custom"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setPeriod(value as Period)
              }
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                period === value
                  ? "bg-blue-600 text-white"
                  : "border bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Start Date
              </label>

              <input
                type="date"
                value={customStart}
                onChange={(e) =>
                  setCustomStart(e.target.value)
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
                  setCustomEnd(e.target.value)
                }
                className="w-full rounded-lg border p-3"
              />
            </div>
          </div>
        )}
      </section>

      {/* LOADING */}

      {loading && (
        <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">
            Loading Profit & Loss statement...
          </p>
        </div>
      )}

      {/* ERROR */}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
          <p className="font-semibold">
            Unable to load Profit & Loss.
          </p>

          <p className="mt-1 text-sm">
            {error}
          </p>
        </div>
      )}

      {/* REPORT */}

      {!loading && !error && data && (
        <>

          {/* SUMMARY CARDS */}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Revenue"
              value={money(revenue)}
              description="Total sales revenue"
            />

            <SummaryCard
              title="Gross Profit"
              value={money(grossProfit)}
              description={`${grossMargin.toFixed(2)}% gross margin`}
              positive={grossProfit >= 0}
            />

            <SummaryCard
              title="Operating Expenses"
              value={money(expenses)}
              description="Recorded operating expenses"
            />

            <SummaryCard
              title="Net Profit"
              value={money(netProfit)}
              description={`${netMargin.toFixed(2)}% net margin`}
              positive={netProfit >= 0}
            />
          </section>

          {/* PROFIT & LOSS STATEMENT */}

          <section className="rounded-xl border bg-white shadow-sm">

            <div className="border-b p-6 text-center">
              <h2 className="text-2xl font-bold">
                REXY BLOCKS FACTORY
              </h2>

              <p className="mt-1 text-lg font-semibold">
                PROFIT & LOSS STATEMENT
              </p>

              <p className="mt-1 text-sm text-gray-500">
                {period === "all"
                  ? "All Time"
                  : period === "today"
                    ? "Today"
                    : period === "week"
                      ? "This Week"
                      : period === "month"
                        ? "This Month"
                        : period === "year"
                          ? "This Year"
                          : `${customStart} to ${customEnd}`}
              </p>
            </div>

            <div className="p-6">

              {/* REVENUE */}

              <div>
                <h3 className="mb-2 text-lg font-semibold">
                  Revenue
                </h3>

                <ReportRow
                  label="Sales Revenue"
                  value={revenue}
                />
              </div>

              {/* COGS */}

              <div className="mt-6">
                <h3 className="mb-2 text-lg font-semibold">
                  Cost of Goods Sold
                </h3>

                <ReportRow
                  label="Production COGS"
                  value={cogs}
                  negative
                />

                <ReportRow
                  label="Gross Profit"
                  value={grossProfit}
                  bold
                  border
                />
              </div>

              {/* MARGINS */}

              <div className="mt-6 rounded-lg bg-gray-50 p-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    Gross Margin
                  </span>

                  <span className="font-semibold">
                    {grossMargin.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* EXPENSES */}

              <div className="mt-6">
                <h3 className="mb-2 text-lg font-semibold">
                  Operating Expenses
                </h3>

                <ReportRow
                  label="Total Operating Expenses"
                  value={expenses}
                  negative
                />

                <ReportRow
                  label="Net Profit"
                  value={netProfit}
                  bold
                  border
                />
              </div>

              {/* NET MARGIN */}

              <div className="mt-6 rounded-lg bg-gray-50 p-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    Net Margin
                  </span>

                  <span
                    className={`font-semibold ${
                      netProfit >= 0
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {netMargin.toFixed(2)}%
                  </span>
                </div>
              </div>

            </div>
          </section>

          {/* COST WARNING */}

          {data.salesWithUnknownCost > 0 && (
            <section className="rounded-xl border border-yellow-300 bg-yellow-50 p-5">
              <h2 className="font-semibold text-yellow-900">
                Cost Data Incomplete
              </h2>

              <p className="mt-2 text-sm text-yellow-800">
                {data.salesWithUnknownCost} sales
                in this reporting period do not
                have recorded COGS.
              </p>

              <p className="mt-2 text-sm text-yellow-800">
                Gross profit and net profit are
                therefore reported on a
                known-cost basis.
              </p>
            </section>
          )}

          {/* ACCOUNTING NOTE */}

          <section className="rounded-xl border bg-gray-50 p-5">
            <h2 className="font-semibold">
              Accounting Note
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              This report uses recorded sales,
              known production COGS and recorded
              operating expenses. Historical sales
              without recorded production costs are
              excluded from COGS rather than being
              incorrectly treated as zero-cost sales.
            </p>
          </section>

        </>
      )}

    </main>
  );
}
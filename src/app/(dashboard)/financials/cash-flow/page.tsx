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
    const start = localDateString(now);

    const end = new Date(now);
    end.setDate(end.getDate() + 1);

    return {
      startDate: start,
      endDate: localDateString(end),
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

function CashFlowRow({
  label,
  value,
  negative = false,
  bold = false,
  border = false,
}: {
  label: string;
  value: number;
  negative?: boolean;
  bold?: boolean;
  border?: boolean;
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

export default function CashFlowPage() {
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

    if (
      period === "custom" &&
      (!customStart || !customEnd)
    ) {
      setLoading(false);
      return;
    }

    const range = getPeriodRange(
      period,
      customStart,
      customEnd
    );

    const result =
      await getFinancialSummary(range);

    if (result.error) {
      console.error(
        "Cash Flow error:",
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

  /*
   * IMPORTANT:
   *
   * Payments received are actual cash inflows.
   * Sales revenue is not automatically treated
   * as cash received because credit sales may
   * still be outstanding.
   *
   * Expenses are treated as recorded cash
   * outflows by the current financial service.
   */

  const revenue =
    Number(data?.totalRevenue || 0);

  const paymentsReceived =
  Number(data?.totalPaid || 0);

  const receivables =
  Number(data?.totalReceivable || 0);

  const expenses =
    Number(data?.totalExpenses || 0);

  const cashInflows =
    paymentsReceived;

  const cashOutflows =
    expenses;

  const netCashFlow =
    cashInflows - cashOutflows;

  const creditSales =
    Math.max(
      revenue - paymentsReceived,
      0
    );

  return (
    <main className="space-y-8 p-6">

      {/* HEADER */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:flex-row">
        <div>
          <h1 className="text-3xl font-bold">
            Cash Flow
          </h1>

          <p className="mt-1 text-gray-600">
            Rexy Blocks Factory cash inflow and
            outflow report.
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

      {/* PERIOD FILTER */}

      <section className="rounded-xl border bg-white p-5 shadow-sm print:hidden">
        <h2 className="font-semibold">
          Reporting Period
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Select the period for the cash-flow
          statement.
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
            Loading Cash Flow statement...
          </p>
        </div>
      )}

      {/* ERROR */}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
          <p className="font-semibold">
            Unable to load Cash Flow.
          </p>

          <p className="mt-1 text-sm">
            {error}
          </p>
        </div>
      )}

      {!loading && !error && data && (
        <>

          {/* SUMMARY */}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

            <SummaryCard
              title="Cash Received"
              value={money(paymentsReceived)}
              description="Customer payments received"
              positive={paymentsReceived > 0}
            />

            <SummaryCard
              title="Cash Outflows"
              value={money(cashOutflows)}
              description="Recorded expenses"
            />

            <SummaryCard
              title="Net Cash Flow"
              value={money(netCashFlow)}
              description="Inflows minus outflows"
              positive={
                netCashFlow >= 0
              }
            />

            <SummaryCard
              title="Receivables"
              value={money(receivables)}
              description="Outstanding customer balances"
            />

          </section>

          {/* CASH FLOW STATEMENT */}

          <section className="rounded-xl border bg-white shadow-sm">

            <div className="border-b p-6 text-center">
              <h2 className="text-2xl font-bold">
                REXY BLOCKS FACTORY
              </h2>

              <p className="mt-1 text-lg font-semibold">
                CASH FLOW STATEMENT
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

              {/* CASH INFLOWS */}

              <div>
                <h3 className="mb-2 text-lg font-semibold">
                  Cash Inflows
                </h3>

                <CashFlowRow
                  label="Customer Payments Received"
                  value={paymentsReceived}
                />

                <CashFlowRow
                  label="Total Cash Inflows"
                  value={cashInflows}
                  bold
                  border
                />
              </div>

              {/* CASH OUTFLOWS */}

              <div className="mt-8">
                <h3 className="mb-2 text-lg font-semibold">
                  Cash Outflows
                </h3>

                <CashFlowRow
                  label="Operating Expenses"
                  value={expenses}
                  negative
                />

                <CashFlowRow
                  label="Total Cash Outflows"
                  value={cashOutflows}
                  negative
                  bold
                  border
                />
              </div>

              {/* NET CASH FLOW */}

              <div className="mt-8 rounded-xl border-2 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">
                    Net Cash Flow
                  </span>

                  <span
                    className={`text-2xl font-bold ${
                      netCashFlow >= 0
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {netCashFlow < 0
                      ? "-"
                      : ""}
                    {money(
                      Math.abs(netCashFlow)
                    )}
                  </span>
                </div>
              </div>

            </div>
          </section>

          {/* SALES VS CASH */}

          <section className="grid gap-6 lg:grid-cols-2">

            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">
                Sales vs Cash Received
              </h2>

              <div className="mt-4 space-y-3">

                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Sales Revenue
                  </span>

                  <span className="font-semibold">
                    {money(revenue)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Payments Received
                  </span>

                  <span className="font-semibold text-green-700">
                    {money(paymentsReceived)}
                  </span>
                </div>

                <div className="flex justify-between border-t pt-3">
                  <span className="font-semibold">
                    Uncollected Sales
                  </span>

                  <span className="font-semibold text-orange-600">
                    {money(creditSales)}
                  </span>
                </div>

              </div>
            </div>

            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">
                Receivables
              </h2>

              <div className="mt-4">

                <p className="text-sm text-gray-500">
                  Outstanding customer balances
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {money(receivables)}
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  This represents money owed to
                  Rexy Blocks Factory and not yet
                  collected as cash.
                </p>

              </div>
            </div>

          </section>

          {/* CASH FLOW INTERPRETATION */}

          <section className="rounded-xl border bg-gray-50 p-5">

            <h2 className="font-semibold">
              Cash Flow Interpretation
            </h2>

            <div className="mt-3 space-y-2 text-sm text-gray-600">

              {netCashFlow > 0 ? (
                <p>
                  Cash inflows exceeded recorded
                  cash outflows during this period.
                </p>
              ) : netCashFlow < 0 ? (
                <p>
                  Recorded cash outflows exceeded
                  customer payments during this
                  period.
                </p>
              ) : (
                <p>
                  Cash inflows and recorded cash
                  outflows were equal during this
                  period.
                </p>
              )}

              {creditSales > 0 && (
                <p>
                  Some sales revenue has not yet
                  been collected as cash.
                </p>
              )}

              <p>
                Cash Flow should be interpreted
                separately from Profit & Loss:
                revenue can be recorded before the
                customer actually pays.
              </p>

            </div>

          </section>

        </>
      )}

    </main>
  );
}
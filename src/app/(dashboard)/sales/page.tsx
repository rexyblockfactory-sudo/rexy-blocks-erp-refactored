"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import { getSales } from "@/services/sales";

import type { Sale } from "@/types/sale";

export default function SalesPage() {
  // ============================================================
  // STATE
  // ============================================================

  const [loading, setLoading] =
    useState(true);

  const [sales, setSales] =
    useState<Sale[]>([]);

  const [errorMessage, setErrorMessage] =
    useState("");

  // ============================================================
  // LOAD SALES
  // ============================================================

  const loadSales = useCallback(
    async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const result =
          await getSales();

        if (result.error) {
          console.error(
            "Sales error:",
            result.error
          );

          setErrorMessage(
            result.error.message ||
              "Unable to load sales."
          );

          setSales([]);
          return;
        }

        setSales(
          result.data ?? []
        );
      } catch (error) {
        console.error(
          "Unexpected sales error:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load sales."
        );

        setSales([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    void loadSales();
  }, [loadSales]);

  // ============================================================
  // MONEY FORMAT
  // ============================================================

  function formatMoney(
    value:
      | number
      | string
      | null
      | undefined
  ) {
    const numberValue =
      Number(value ?? 0);

    return new Intl.NumberFormat(
      "en-GH",
      {
        style: "currency",
        currency: "GHS",
        minimumFractionDigits: 2,
      }
    ).format(numberValue);
  }

  // ============================================================
  // DATE FORMAT
  // ============================================================

  function formatDate(
    value:
      | string
      | null
      | undefined
  ) {
    if (!value) {
      return "—";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "—";
    }

    return date.toLocaleString(
      "en-GH",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }

  // ============================================================
  // PAYMENT STATUS
  // ============================================================

  function getPaymentStatus(
    sale: Sale
  ) {
    const total =
      Number(
        sale.total_amount ?? 0
      );

    const paid =
      Number(
        sale.amount_paid ?? 0
      );

    const balance =
      Number(
        sale.balance_due ?? 0
      );

    if (
      balance <= 0 &&
      paid >= total
    ) {
      return "Paid";
    }

    if (paid > 0) {
      return "Partially Paid";
    }

    return "Unpaid";
  }

  // ============================================================
  // SUMMARY
  // ============================================================

  const totalSales =
    sales.length;

  const totalRevenue =
    sales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.total_amount ?? 0
        ),
      0
    );

  const totalPaid =
    sales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.amount_paid ?? 0
        ),
      0
    );

  const totalOutstanding =
    sales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.balance_due ?? 0
        ),
      0
    );

  const totalProfit =
    sales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.gross_profit ?? 0
        ),
      0
    );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <main className="space-y-8">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Sales
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            View and manage sales for Rexy
            Blocks Factory.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/sales/new"
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            New Sale
          </Link>

          <Link
            href="/sales/history"
            className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Sales History
          </Link>
        </div>
      </div>

      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {/* TOTAL SALES */}

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Sales
          </p>

          <p className="mt-2 text-2xl font-bold">
            {totalSales}
          </p>
        </div>

        {/* REVENUE */}

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Revenue
          </p>

          <p className="mt-2 text-2xl font-bold">
            {formatMoney(
              totalRevenue
            )}
          </p>
        </div>

        {/* PAID */}

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Amount Paid
          </p>

          <p className="mt-2 text-2xl font-bold">
            {formatMoney(
              totalPaid
            )}
          </p>
        </div>

        {/* OUTSTANDING */}

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Outstanding
          </p>

          <p className="mt-2 text-2xl font-bold">
            {formatMoney(
              totalOutstanding
            )}
          </p>
        </div>

        {/* PROFIT */}

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Gross Profit
          </p>

          <p
            className={`mt-2 text-2xl font-bold ${
              totalProfit >= 0
                ? "text-green-700"
                : "text-red-700"
            }`}
          >
            {formatMoney(
              totalProfit
            )}
          </p>
        </div>
      </section>

      {/* ======================================================
          SALES LIST
      ====================================================== */}

      <section className="space-y-4">
        {/* SECTION HEADER */}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              Recent Sales
            </h2>

            <p className="text-sm text-gray-500">
              Latest transactions recorded
              in the system.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadSales();
            }}
            disabled={loading}
            className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>

        {/* ====================================================
            ERROR
        ==================================================== */}

        {errorMessage && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <strong>
              Unable to load sales:
            </strong>{" "}
            {errorMessage}
          </div>
        )}

        {/* ====================================================
            LOADING
        ==================================================== */}

        {loading && (
          <div className="rounded-xl border bg-white p-8 text-center">
            <p className="text-sm text-gray-500">
              Loading sales...
            </p>
          </div>
        )}

        {/* ====================================================
            EMPTY STATE
        ==================================================== */}

        {!loading &&
          !errorMessage &&
          sales.length === 0 && (
            <div className="rounded-xl border bg-white p-8 text-center">
              <p className="font-medium text-gray-700">
                No sales found.
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Create your first sale to
                see it here.
              </p>

              <Link
                href="/sales/new"
                className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Create Sale
              </Link>
            </div>
          )}

        {/* ====================================================
            SALES TABLE
        ==================================================== */}

        {!loading &&
          sales.length > 0 && (
            <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
              <table className="min-w-full divide-y">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Date
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Customer
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Product
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Qty
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Unit Price
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Total
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Paid
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Balance
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      COGS
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Profit
                    </th>

                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>

                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y bg-white">
                  {sales.map(
                    (sale) => {
                      const status =
                        getPaymentStatus(
                          sale
                        );

                      const profit =
                        Number(
                          sale.gross_profit ??
                            0
                        );

                      return (
                        <tr
                          key={sale.id}
                          className="hover:bg-gray-50"
                        >
                          {/* DATE */}

                          <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">
                            {formatDate(
                              sale.created_at
                            )}
                          </td>

                          {/* CUSTOMER */}

                          <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900">
                            {sale.customer_name}
                          </td>

                          {/* PRODUCT */}

                          <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                            {sale.product_name}
                          </td>

                          {/* QUANTITY */}

                          <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-700">
                            {sale.quantity}
                          </td>

                          {/* UNIT PRICE */}

                          <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-700">
                            {formatMoney(
                              sale.unit_price
                            )}
                          </td>

                          {/* TOTAL */}

                          <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold text-gray-900">
                            {formatMoney(
                              sale.total_amount
                            )}
                          </td>

                          {/* PAID */}

                          <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-700">
                            {formatMoney(
                              sale.amount_paid
                            )}
                          </td>

                          {/* BALANCE */}

                          <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-medium text-gray-700">
                            {formatMoney(
                              sale.balance_due
                            )}
                          </td>

                          {/* COGS */}

                          <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-700">
                            {formatMoney(
                              sale.cogs
                            )}
                          </td>

                          {/* PROFIT */}

                          <td
                            className={`whitespace-nowrap px-4 py-4 text-right text-sm font-semibold ${
                              profit >= 0
                                ? "text-green-700"
                                : "text-red-700"
                            }`}
                          >
                            {formatMoney(
                              sale.gross_profit
                            )}
                          </td>

                          {/* STATUS */}

                          <td className="whitespace-nowrap px-4 py-4 text-center">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                status ===
                                "Paid"
                                  ? "bg-green-100 text-green-700"
                                  : status ===
                                    "Partially Paid"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {status}
                            </span>
                          </td>

                          {/* ACTION */}

                          <td className="whitespace-nowrap px-4 py-4 text-center">
                            <Link
                              href={`/sales/${sale.id}`}
                              className="rounded-md px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 hover:underline"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
      </section>
    </main>
  );
}
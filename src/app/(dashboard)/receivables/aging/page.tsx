"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface Sale {
  id: string;
  customer_name: string | null;
  product_name: string | null;
  quantity: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  created_at: string;
}

interface Payment {
  id: string;
  sale_id: string;
  amount: number;
  created_at: string;
}

interface AgingSale {
  id: string;
  customerName: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  createdAt: string;
  daysOutstanding: number;
  bucket: string;
}

function money(value: number) {
  return `GH₵${Number(value || 0).toLocaleString(
    "en-GH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function getAgingBucket(days: number) {
  if (days <= 30) {
    return "Current";
  }

  if (days <= 60) {
    return "31–60 Days";
  }

  if (days <= 90) {
    return "61–90 Days";
  }

  return "90+ Days";
}

function bucketClass(bucket: string) {
  switch (bucket) {
    case "Current":
      return "bg-green-100 text-green-700";

    case "31–60 Days":
      return "bg-yellow-100 text-yellow-700";

    case "61–90 Days":
      return "bg-orange-100 text-orange-700";

    default:
      return "bg-red-100 text-red-700";
  }
}

export default function ReceivablesAgingPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<
    Payment[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState("");

  const [search, setSearch] = useState("");
  const [bucketFilter, setBucketFilter] =
    useState("All");

  useEffect(() => {
    loadReceivables();
  }, []);

  async function loadReceivables() {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: salesData,
        error: salesError,
      } = await supabase
        .from("sales")
        .select(
          `
            id,
            customer_name,
            product_name,
            quantity,
            total_amount,
            amount_paid,
            balance_due,
            created_at
          `
        )
        .order("created_at", {
          ascending: true,
        });

      if (salesError) {
        throw new Error(
          salesError.message
        );
      }

      const saleRows =
        (salesData || []) as Sale[];

      setSales(saleRows);

      /*
       * Load actual payment transactions.
       *
       * We calculate the outstanding amount
       * from the payment ledger instead of
       * trusting potentially stale balance_due
       * values.
       */
      const saleIds = saleRows.map(
        (sale) => sale.id
      );

      if (saleIds.length === 0) {
        setPayments([]);
        return;
      }

      const {
        data: paymentData,
        error: paymentError,
      } = await supabase
        .from("sale_payments")
        .select(
          `
            id,
            sale_id,
            amount,
            created_at
          `
        )
        .in("sale_id", saleIds);

      if (paymentError) {
        throw new Error(
          paymentError.message
        );
      }

      setPayments(
        (paymentData || []) as Payment[]
      );
    } catch (error) {
      console.error(
        "Receivables aging error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load receivables aging."
      );

      setSales([]);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }

  const agingSales = useMemo(() => {
    const paymentsBySale =
      new Map<string, number>();

    payments.forEach((payment) => {
      const current =
        paymentsBySale.get(
          payment.sale_id
        ) || 0;

      paymentsBySale.set(
        payment.sale_id,
        current +
          Number(payment.amount || 0)
      );
    });

    const now = new Date();

    const result: AgingSale[] = [];

    sales.forEach((sale) => {
      const totalAmount = Number(
        sale.total_amount || 0
      );

      const actualPayments =
        paymentsBySale.get(sale.id) || 0;

      /*
       * If the sale has payment records,
       * use them.
       *
       * For old sales without payment
       * ledger records, retain amount_paid
       * as a fallback.
       */
      const amountPaid =
        paymentsBySale.has(sale.id)
          ? actualPayments
          : Number(
              sale.amount_paid || 0
            );

      const balance = Math.max(
        0,
        totalAmount - amountPaid
      );

      /*
       * Only outstanding sales belong
       * in receivables aging.
       */
      if (balance <= 0) {
        return;
      }

      const createdDate =
        new Date(sale.created_at);

      const difference =
        now.getTime() -
        createdDate.getTime();

      const daysOutstanding =
        Math.max(
          0,
          Math.floor(
            difference /
              (1000 *
                60 *
                60 *
                24)
          )
        );

      const bucket =
        getAgingBucket(
          daysOutstanding
        );

      result.push({
        id: sale.id,
        customerName:
          sale.customer_name?.trim() ||
          "N/A",
        productName:
          sale.product_name ||
          "N/A",
        quantity: Number(
          sale.quantity || 0
        ),
        totalAmount,
        amountPaid,
        balance,
        createdAt:
          sale.created_at,
        daysOutstanding,
        bucket,
      });
    });

    /*
     * Oldest debts first.
     */
    return result.sort(
      (a, b) =>
        b.daysOutstanding -
        a.daysOutstanding
    );
  }, [sales, payments]);

  const filteredSales = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return agingSales.filter(
      (sale) => {
        const matchesSearch =
          !query ||
          sale.customerName
            .toLowerCase()
            .includes(query) ||
          sale.productName
            .toLowerCase()
            .includes(query);

        const matchesBucket =
          bucketFilter === "All" ||
          sale.bucket ===
            bucketFilter;

        return (
          matchesSearch &&
          matchesBucket
        );
      }
    );
  }, [
    agingSales,
    search,
    bucketFilter,
  ]);

  const currentTotal =
    agingSales
      .filter(
        (sale) =>
          sale.bucket ===
          "Current"
      )
      .reduce(
        (sum, sale) =>
          sum + sale.balance,
        0
      );

  const days31to60Total =
    agingSales
      .filter(
        (sale) =>
          sale.bucket ===
          "31–60 Days"
      )
      .reduce(
        (sum, sale) =>
          sum + sale.balance,
        0
      );

  const days61to90Total =
    agingSales
      .filter(
        (sale) =>
          sale.bucket ===
          "61–90 Days"
      )
      .reduce(
        (sum, sale) =>
          sum + sale.balance,
        0
      );

  const days90PlusTotal =
    agingSales
      .filter(
        (sale) =>
          sale.bucket ===
          "90+ Days"
      )
      .reduce(
        (sum, sale) =>
          sum + sale.balance,
        0
      );

  const totalOutstanding =
    agingSales.reduce(
      (sum, sale) =>
        sum + sale.balance,
      0
    );

  const customersOwing =
    new Set(
      agingSales.map(
        (sale) =>
          sale.customerName
      )
    ).size;

  function printReport() {
    window.print();
  }

  return (
    <main className="space-y-6 p-6">

      {/* HEADER */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">

        <div>
          <h1 className="text-3xl font-bold">
            Receivables Aging
          </h1>

          <p className="mt-1 text-gray-600">
            Analyze outstanding
            customer balances by
            age.
          </p>
        </div>

        <button
          type="button"
          onClick={printReport}
          className="rounded-lg bg-black px-4 py-2 text-white hover:bg-gray-800"
        >
          Print Report
        </button>

      </div>

      {/* ERROR */}

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 print:hidden">

          <p className="font-semibold">
            Receivables Error
          </p>

          <p className="mt-1">
            {errorMessage}
          </p>

        </div>
      )}

      {/* SUMMARY */}

      <div className="grid gap-4 md:grid-cols-5">

        <div className="rounded-lg border bg-white p-5 shadow-sm">

          <p className="text-sm text-gray-500">
            Total Outstanding
          </p>

          <p className="mt-2 text-2xl font-bold">
            {money(
              totalOutstanding
            )}
          </p>

        </div>

        <div className="rounded-lg border bg-white p-5 shadow-sm">

          <p className="text-sm text-gray-500">
            Current
          </p>

          <p className="mt-2 text-2xl font-bold">
            {money(
              currentTotal
            )}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            0–30 days
          </p>

        </div>

        <div className="rounded-lg border bg-white p-5 shadow-sm">

          <p className="text-sm text-gray-500">
            31–60 Days
          </p>

          <p className="mt-2 text-2xl font-bold">
            {money(
              days31to60Total
            )}
          </p>

        </div>

        <div className="rounded-lg border bg-white p-5 shadow-sm">

          <p className="text-sm text-gray-500">
            61–90 Days
          </p>

          <p className="mt-2 text-2xl font-bold">
            {money(
              days61to90Total
            )}
          </p>

        </div>

        <div className="rounded-lg border bg-white p-5 shadow-sm">

          <p className="text-sm text-gray-500">
            90+ Days
          </p>

          <p className="mt-2 text-2xl font-bold">
            {money(
              days90PlusTotal
            )}
          </p>

        </div>

      </div>

      {/* CUSTOMER COUNT */}

      <div className="rounded-lg border bg-white p-5 shadow-sm">

        <p className="text-sm text-gray-500">
          Customers Owing
        </p>

        <p className="mt-2 text-2xl font-bold">
          {customersOwing}
        </p>

      </div>

      {/* FILTERS */}

      <div className="grid gap-4 rounded-lg border bg-white p-5 shadow-sm md:grid-cols-2 print:hidden">

        <div>

          <label
            htmlFor="aging-search"
            className="mb-2 block text-sm font-semibold"
          >
            Search
          </label>

          <input
            id="aging-search"
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Customer or product..."
            className="w-full rounded-lg border px-3 py-2"
          />

        </div>

        <div>

          <label
            htmlFor="bucket"
            className="mb-2 block text-sm font-semibold"
          >
            Aging Bucket
          </label>

          <select
            id="bucket"
            value={bucketFilter}
            onChange={(event) =>
              setBucketFilter(
                event.target.value
              )
            }
            className="w-full rounded-lg border px-3 py-2"
          >

            <option value="All">
              All
            </option>

            <option value="Current">
              Current — 0–30 Days
            </option>

            <option value="31–60 Days">
              31–60 Days
            </option>

            <option value="61–90 Days">
              61–90 Days
            </option>

            <option value="90+ Days">
              90+ Days
            </option>

          </select>

        </div>

      </div>

      {/* TABLE */}

      {loading ? (

        <div className="rounded-lg border bg-white p-10 text-center">
          Loading receivables aging...
        </div>

      ) : (

        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">

          <table className="min-w-full">

            <thead className="bg-gray-50">

              <tr>

                <th className="border-b p-3 text-left text-sm font-semibold">
                  Customer
                </th>

                <th className="border-b p-3 text-left text-sm font-semibold">
                  Product
                </th>

                <th className="border-b p-3 text-right text-sm font-semibold">
                  Qty
                </th>

                <th className="border-b p-3 text-right text-sm font-semibold">
                  Total
                </th>

                <th className="border-b p-3 text-right text-sm font-semibold">
                  Paid
                </th>

                <th className="border-b p-3 text-right text-sm font-semibold">
                  Balance
                </th>

                <th className="border-b p-3 text-left text-sm font-semibold">
                  Sale Date
                </th>

                <th className="border-b p-3 text-center text-sm font-semibold">
                  Days
                </th>

                <th className="border-b p-3 text-center text-sm font-semibold">
                  Aging
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredSales.length ===
              0 ? (

                <tr>

                  <td
                    colSpan={9}
                    className="p-10 text-center text-gray-500"
                  >
                    No outstanding
                    receivables found.
                  </td>

                </tr>

              ) : (

                filteredSales.map(
                  (sale) => (
                    <tr
                      key={sale.id}
                      className="border-b last:border-b-0 hover:bg-gray-50"
                    >

                      <td className="p-3 font-semibold">
                        {
                          sale.customerName
                        }
                      </td>

                      <td className="p-3">
                        {
                          sale.productName
                        }
                      </td>

                      <td className="p-3 text-right">
                        {sale.quantity.toLocaleString()}
                      </td>

                      <td className="whitespace-nowrap p-3 text-right">
                        {money(
                          sale.totalAmount
                        )}
                      </td>

                      <td className="whitespace-nowrap p-3 text-right">
                        {money(
                          sale.amountPaid
                        )}
                      </td>

                      <td className="whitespace-nowrap p-3 text-right font-semibold">
                        {money(
                          sale.balance
                        )}
                      </td>

                      <td className="whitespace-nowrap p-3">
                        {new Date(
                          sale.createdAt
                        ).toLocaleDateString(
                          "en-GH"
                        )}
                      </td>

                      <td className="p-3 text-center">
                        {
                          sale.daysOutstanding
                        }
                      </td>

                      <td className="p-3 text-center">

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${bucketClass(
                            sale.bucket
                          )}`}
                        >
                          {
                            sale.bucket
                          }
                        </span>

                      </td>

                    </tr>
                  )
                )

              )}

            </tbody>

            {filteredSales.length >
              0 && (
              <tfoot className="bg-gray-50">

                <tr>

                  <td
                    colSpan={5}
                    className="p-3 text-right font-bold"
                  >
                    Filtered Outstanding
                  </td>

                  <td className="whitespace-nowrap p-3 text-right font-bold">
                    {money(
                      filteredSales.reduce(
                        (
                          sum,
                          sale
                        ) =>
                          sum +
                          sale.balance,
                        0
                      )
                    )}
                  </td>

                  <td
                    colSpan={3}
                  />

                </tr>

              </tfoot>
            )}

          </table>

        </div>

      )}

      {/* REPORT FOOTER */}

      <div className="hidden border-t pt-6 text-sm text-gray-500 print:block">

        <p>
          Rexy Blocks Factory
        </p>

        <p>
          Receivables Aging
          Report
        </p>

        <p>
          Generated:{" "}
          {new Date().toLocaleString(
            "en-GH"
          )}
        </p>

      </div>

      {/* PRINT CSS */}

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          nav,
          aside,
          header,
          button,
          select,
          input {
            display: none !important;
          }

          main {
            padding: 0 !important;
          }

          table {
            width: 100%;
          }

          th,
          td {
            border-color: #d1d5db !important;
          }
        }
      `}</style>

    </main>
  );
}
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

type AgingBucket =
  | "Current"
  | "31-60 Days"
  | "61-90 Days"
  | "90+ Days";

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
  bucket: AgingBucket;
}

function money(value: number) {
  return `GH₵${Number(value || 0).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getAgingBucket(days: number): AgingBucket {
  if (days <= 30) {
    return "Current";
  }

  if (days <= 60) {
    return "31-60 Days";
  }

  if (days <= 90) {
    return "61-90 Days";
  }

  return "90+ Days";
}

function bucketClass(bucket: AgingBucket) {
  switch (bucket) {
    case "Current":
      return "bg-green-100 text-green-700";

    case "31-60 Days":
      return "bg-yellow-100 text-yellow-700";

    case "61-90 Days":
      return "bg-orange-100 text-orange-700";

    case "90+ Days":
      return "bg-red-100 text-red-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

function formatDate(value: string) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("en-GH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ReceivablesAgingPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");

  const [bucketFilter, setBucketFilter] =
    useState<"All" | AgingBucket>("All");

  const [sortBy, setSortBy] = useState<
    "oldest" | "newest" | "highest" | "lowest"
  >("oldest");

  /*
   * Important:
   * This starts as null so the server and client
   * render the same HTML during hydration.
   */
  const [generatedAt, setGeneratedAt] =
    useState<string | null>(null);

  useEffect(() => {
    setGeneratedAt(
      new Date().toLocaleString("en-GH")
    );

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
        throw new Error(salesError.message);
      }

      const saleRows =
        (salesData || []) as Sale[];

      setSales(saleRows);

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
        throw new Error(paymentError.message);
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
        paymentsBySale.get(payment.sale_id) || 0;

      paymentsBySale.set(
        payment.sale_id,
        current + Number(payment.amount || 0)
      );
    });

    const now = new Date();

    const result: AgingSale[] = [];

    sales.forEach((sale) => {
      const totalAmount = Number(
        sale.total_amount || 0
      );

      const hasPaymentLedger =
        paymentsBySale.has(sale.id);

      const actualPayments =
        paymentsBySale.get(sale.id) || 0;

      const amountPaid = hasPaymentLedger
        ? actualPayments
        : Number(sale.amount_paid || 0);

      const balance = Math.max(
        0,
        totalAmount - amountPaid
      );

      /*
       * Fully paid sales do not belong
       * in receivables aging.
       */
      if (balance <= 0.005) {
        return;
      }

      const createdDate =
        new Date(sale.created_at);

      const difference =
        now.getTime() -
        createdDate.getTime();

      const daysOutstanding = Math.max(
        0,
        Math.floor(
          difference /
            (1000 * 60 * 60 * 24)
        )
      );

      result.push({
        id: sale.id,

        customerName:
          sale.customer_name?.trim() ||
          "Walk-in Customer",

        productName:
          sale.product_name?.trim() ||
          "N/A",

        quantity: Number(
          sale.quantity || 0
        ),

        totalAmount,

        amountPaid,

        balance,

        createdAt: sale.created_at,

        daysOutstanding,

        bucket:
          getAgingBucket(daysOutstanding),
      });
    });

    return result;
  }, [sales, payments]);

  const filteredSales = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    const result = agingSales.filter(
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
          sale.bucket === bucketFilter;

        return (
          matchesSearch &&
          matchesBucket
        );
      }
    );

    return [...result].sort(
      (a, b) => {
        switch (sortBy) {
          case "newest":
            return (
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
            );

          case "highest":
            return b.balance - a.balance;

          case "lowest":
            return a.balance - b.balance;

          case "oldest":
          default:
            return (
              b.daysOutstanding -
              a.daysOutstanding
            );
        }
      }
    );
  }, [
    agingSales,
    search,
    bucketFilter,
    sortBy,
  ]);

  const currentTotal = agingSales
    .filter(
      (sale) =>
        sale.bucket === "Current"
    )
    .reduce(
      (sum, sale) =>
        sum + sale.balance,
      0
    );

  const days31to60Total = agingSales
    .filter(
      (sale) =>
        sale.bucket === "31-60 Days"
    )
    .reduce(
      (sum, sale) =>
        sum + sale.balance,
      0
    );

  const days61to90Total = agingSales
    .filter(
      (sale) =>
        sale.bucket === "61-90 Days"
    )
    .reduce(
      (sum, sale) =>
        sum + sale.balance,
      0
    );

  const days90PlusTotal = agingSales
    .filter(
      (sale) =>
        sale.bucket === "90+ Days"
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

  const totalOriginalSales =
    agingSales.reduce(
      (sum, sale) =>
        sum + sale.totalAmount,
      0
    );

  const totalPaid =
    agingSales.reduce(
      (sum, sale) =>
        sum + sale.amountPaid,
      0
    );

  const customersOwing =
    new Set(
      agingSales.map(
        (sale) => sale.customerName
      )
    ).size;

  const filteredOutstanding =
    filteredSales.reduce(
      (sum, sale) =>
        sum + sale.balance,
      0
    );

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
            Analyze outstanding customer
            balances by age.
          </p>
        </div>

        <button
          type="button"
          onClick={printReport}
          className="rounded-lg bg-black px-4 py-2 font-semibold text-white hover:bg-gray-800"
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

          <button
            type="button"
            onClick={loadReceivables}
            className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
          >
            Try Again
          </button>

        </div>
      )}

      {/* SUMMARY CARDS */}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Outstanding
          </p>

          <p className="mt-2 text-2xl font-bold">
            {money(totalOutstanding)}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {customersOwing} customer
            {customersOwing === 1
              ? ""
              : "s"} owing
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Current
          </p>

          <p className="mt-2 text-2xl font-bold text-green-700">
            {money(currentTotal)}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            0-30 days
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            31-60 Days
          </p>

          <p className="mt-2 text-2xl font-bold text-yellow-700">
            {money(days31to60Total)}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            61-90 Days
          </p>

          <p className="mt-2 text-2xl font-bold text-orange-700">
            {money(days61to90Total)}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            90+ Days
          </p>

          <p className="mt-2 text-2xl font-bold text-red-700">
            {money(days90PlusTotal)}
          </p>
        </div>

      </section>

      {/* RECEIVABLE SUMMARY */}

      <section className="grid gap-4 md:grid-cols-3">

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Outstanding Sales
          </p>

          <p className="mt-2 text-xl font-bold">
            {money(totalOriginalSales)}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Payments Applied
          </p>

          <p className="mt-2 text-xl font-bold text-green-700">
            {money(totalPaid)}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Outstanding Records
          </p>

          <p className="mt-2 text-xl font-bold">
            {agingSales.length.toLocaleString()}
          </p>
        </div>

      </section>

      {/* FILTERS */}

      <section className="grid gap-4 rounded-xl border bg-white p-5 shadow-sm md:grid-cols-3 print:hidden">

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
              setSearch(event.target.value)
            }
            placeholder="Customer or product..."
            className="w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                event.target.value as
                  | "All"
                  | AgingBucket
              )
            }
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="All">
              All Aging
            </option>

            <option value="Current">
              Current - 0-30 Days
            </option>

            <option value="31-60 Days">
              31-60 Days
            </option>

            <option value="61-90 Days">
              61-90 Days
            </option>

            <option value="90+ Days">
              90+ Days
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="sort"
            className="mb-2 block text-sm font-semibold"
          >
            Sort By
          </label>

          <select
            id="sort"
            value={sortBy}
            onChange={(event) =>
              setSortBy(
                event.target.value as
                  | "oldest"
                  | "newest"
                  | "highest"
                  | "lowest"
              )
            }
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="oldest">
              Oldest Debt First
            </option>

            <option value="newest">
              Newest Sale First
            </option>

            <option value="highest">
              Highest Balance First
            </option>

            <option value="lowest">
              Lowest Balance First
            </option>
          </select>
        </div>

      </section>

      {/* FILTER RESULT */}

      {!loading && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-sm text-gray-600">
            Showing{" "}
            <strong>
              {filteredSales.length.toLocaleString()}
            </strong>{" "}
            outstanding record
            {filteredSales.length === 1
              ? ""
              : "s"}
          </p>

          <p className="text-sm font-semibold text-gray-800">
            Filtered Balance:{" "}
            {money(filteredOutstanding)}
          </p>

        </div>
      )}

      {/* TABLE */}

      {loading ? (
        <div className="rounded-xl border bg-white p-10 text-center shadow-sm">
          <p className="text-gray-500">
            Loading receivables aging...
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">

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

              {filteredSales.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-10 text-center text-gray-500"
                  >
                    No outstanding receivables
                    found.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="border-b last:border-b-0 hover:bg-gray-50"
                  >

                    <td className="p-3 font-semibold">
                      {sale.customerName}
                    </td>

                    <td className="p-3">
                      {sale.productName}
                    </td>

                    <td className="p-3 text-right">
                      {sale.quantity.toLocaleString()}
                    </td>

                    <td className="whitespace-nowrap p-3 text-right">
                      {money(sale.totalAmount)}
                    </td>

                    <td className="whitespace-nowrap p-3 text-right text-green-700">
                      {money(sale.amountPaid)}
                    </td>

                    <td className="whitespace-nowrap p-3 text-right font-bold">
                      {money(sale.balance)}
                    </td>

                    <td className="whitespace-nowrap p-3">
                      {formatDate(sale.createdAt)}
                    </td>

                    <td className="p-3 text-center font-medium">
                      {sale.daysOutstanding}
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${bucketClass(
                          sale.bucket
                        )}`}
                      >
                        {sale.bucket}
                      </span>
                    </td>

                  </tr>
                ))
              )}

            </tbody>

            {filteredSales.length > 0 && (
              <tfoot className="bg-gray-50">

                <tr>

                  <td
                    colSpan={5}
                    className="p-3 text-right font-bold"
                  >
                    Filtered Outstanding
                  </td>

                  <td className="whitespace-nowrap p-3 text-right font-bold">
                    {money(filteredOutstanding)}
                  </td>

                  <td colSpan={3} />

                </tr>

              </tfoot>
            )}

          </table>

        </div>
      )}

      {/* PRINT FOOTER */}

      <div className="hidden border-t pt-6 text-sm text-gray-500 print:block">

        <p className="font-semibold">
          Rexy Blocks Factory
        </p>

        <p>
          Receivables Aging Report
        </p>

        <p>
          Generated:{" "}
          {generatedAt ||
            "Preparing report..."}
        </p>

        <p>
          Total Outstanding:{" "}
          {money(totalOutstanding)}
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
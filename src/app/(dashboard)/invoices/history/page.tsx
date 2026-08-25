import Link from "next/link";

import {
  getInvoices,
} from "@/services/invoices";

import type {
  InvoiceWithSale,
} from "@/services/invoices";

/* =========================================================
   MONEY
========================================================= */

function money(value: number) {
  return `GH₵${Number(value || 0).toLocaleString(
    "en-GH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

/* =========================================================
   DATE
========================================================= */

function formatDate(value: string) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString(
    "en-GH",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
}

/* =========================================================
   STATUS
========================================================= */

function getStatus(
  invoice: InvoiceWithSale
) {
  const total =
    Number(invoice.total_amount || 0);

  const paid =
    Number(invoice.amount_paid || 0);

  const balance =
    Number(invoice.balance_due || 0);

  if (
    total > 0 &&
    balance <= 0
  ) {
    return "Paid";
  }

  if (
    paid > 0 &&
    balance > 0
  ) {
    return "Partially Paid";
  }

  if (balance > 0) {
    return "Unpaid";
  }

  /*
   * Older invoices may not have a linked sale.
   * Preserve their stored invoice status when possible.
   */
  if (invoice.payment_status) {
    return invoice.payment_status;
  }

  return "Historical";
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  let className =
    "bg-gray-100 text-gray-700";

  const normalized =
    status.toLowerCase();

  if (normalized === "paid") {
    className =
      "bg-green-100 text-green-700";
  }

  if (
    normalized === "partially paid" ||
    normalized === "partial"
  ) {
    className =
      "bg-yellow-100 text-yellow-800";
  }

  if (normalized === "unpaid") {
    className =
      "bg-red-100 text-red-700";
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {status}
    </span>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default async function InvoiceHistoryPage() {
  const {
    data,
    error,
  } = await getInvoices();

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
      <main className="space-y-6 p-6">

        <div>
          <h1 className="text-3xl font-bold">
            Invoice History
          </h1>

          <p className="mt-1 text-gray-600">
            View all Rexy Blocks Factory invoices.
          </p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">

          <h2 className="font-semibold">
            Unable to load invoices
          </h2>

          <p className="mt-2">
            {error.message}
          </p>

        </div>

      </main>
    );
  }

  const invoices =
    data || [];

  /* =======================================================
     SUMMARY
  ======================================================= */

  const totalInvoiced =
    invoices.reduce(
      (sum, invoice) =>
        sum +
        Number(
          invoice.total_amount || 0
        ),
      0
    );

  const totalPaid =
    invoices.reduce(
      (sum, invoice) =>
        sum +
        Number(
          invoice.amount_paid || 0
        ),
      0
    );

  const totalOutstanding =
    invoices.reduce(
      (sum, invoice) =>
        sum +
        Number(
          invoice.balance_due || 0
        ),
      0
    );

  const outstandingInvoices =
    invoices.filter(
      (invoice) =>
        Number(
          invoice.balance_due || 0
        ) > 0
    ).length;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="space-y-8 p-6">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

        <div>

          <h1 className="text-3xl font-bold">
            Invoice History
          </h1>

          <p className="mt-1 text-gray-600">
            View invoices, payments,
            and outstanding balances.
          </p>

        </div>

        <Link
          href="/invoices"
          className="rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white hover:bg-blue-700"
        >
          Invoice Management
        </Link>

      </div>


      {/* ===================================================
          SUMMARY CARDS
      =================================================== */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-xl border bg-white p-5 shadow-sm">

          <p className="text-sm font-medium text-gray-500">
            Total Invoiced
          </p>

          <p className="mt-2 text-2xl font-bold">
            {money(totalInvoiced)}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {invoices.length} total invoices
          </p>

        </div>


        <div className="rounded-xl border bg-white p-5 shadow-sm">

          <p className="text-sm font-medium text-gray-500">
            Total Paid
          </p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {money(totalPaid)}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Payments recorded against linked sales
          </p>

        </div>


        <div className="rounded-xl border bg-white p-5 shadow-sm">

          <p className="text-sm font-medium text-gray-500">
            Outstanding
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {money(totalOutstanding)}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Current invoice balances
          </p>

        </div>


        <div className="rounded-xl border bg-white p-5 shadow-sm">

          <p className="text-sm font-medium text-gray-500">
            Open Invoices
          </p>

          <p className="mt-2 text-2xl font-bold">
            {outstandingInvoices}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Invoices with balance due
          </p>

        </div>

      </section>


      {/* ===================================================
          TABLE
      =================================================== */}

      <section>

        <div className="mb-4 flex items-center justify-between">

          <div>

            <h2 className="text-xl font-semibold">
              All Invoices
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Most recent invoices appear first.
            </p>

          </div>

          <p className="text-sm text-gray-500">
            {invoices.length}{" "}
            {invoices.length === 1
              ? "invoice"
              : "invoices"}
          </p>

        </div>


        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">

          <table className="min-w-full">

            <thead className="bg-gray-50">

              <tr>

                <th className="whitespace-nowrap p-4 text-left text-sm font-semibold">
                  Invoice
                </th>

                <th className="whitespace-nowrap p-4 text-left text-sm font-semibold">
                  Date
                </th>

                <th className="whitespace-nowrap p-4 text-left text-sm font-semibold">
                  Customer
                </th>

                <th className="whitespace-nowrap p-4 text-left text-sm font-semibold">
                  Product
                </th>

                <th className="whitespace-nowrap p-4 text-right text-sm font-semibold">
                  Qty
                </th>

                <th className="whitespace-nowrap p-4 text-right text-sm font-semibold">
                  Total
                </th>

                <th className="whitespace-nowrap p-4 text-right text-sm font-semibold">
                  Paid
                </th>

                <th className="whitespace-nowrap p-4 text-right text-sm font-semibold">
                  Balance
                </th>

                <th className="whitespace-nowrap p-4 text-left text-sm font-semibold">
                  Status
                </th>

                <th className="whitespace-nowrap p-4 text-left text-sm font-semibold">
                  Action
                </th>

              </tr>

            </thead>


            <tbody>

              {invoices.length === 0 ? (

                <tr>

                  <td
                    colSpan={10}
                    className="p-10 text-center text-gray-500"
                  >
                    No invoices have been created yet.
                  </td>

                </tr>

              ) : (

                invoices.map(
                  (invoice) => {
                    const status =
                      getStatus(
                        invoice
                      );

                    return (
                      <tr
                        key={invoice.id}
                        className="border-t hover:bg-gray-50"
                      >

                        <td className="whitespace-nowrap p-4 font-medium">
                          {invoice.invoice_number}
                        </td>

                        <td className="whitespace-nowrap p-4 text-sm text-gray-600">
                          {formatDate(
                            invoice.created_at
                          )}
                        </td>

                        <td className="whitespace-nowrap p-4">
                          {invoice.customer_name}
                        </td>

                        <td className="whitespace-nowrap p-4">
                          {invoice.product_name ||
                            "N/A"}
                        </td>

                        <td className="whitespace-nowrap p-4 text-right">
                          {Number(
                            invoice.quantity || 0
                          ).toLocaleString(
                            "en-GH"
                          )}
                        </td>

                        <td className="whitespace-nowrap p-4 text-right font-semibold">
                          {money(
                            Number(
                              invoice.total_amount ||
                                0
                            )
                          )}
                        </td>

                        <td className="whitespace-nowrap p-4 text-right font-medium text-green-600">
                          {money(
                            Number(
                              invoice.amount_paid ||
                                0
                            )
                          )}
                        </td>

                        <td
                          className={`whitespace-nowrap p-4 text-right font-semibold ${
                            Number(
                              invoice.balance_due ||
                                0
                            ) > 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {money(
                            Number(
                              invoice.balance_due ||
                                0
                            )
                          )}
                        </td>

                        <td className="whitespace-nowrap p-4">
                          <StatusBadge
                            status={status}
                          />
                        </td>

                        <td className="whitespace-nowrap p-4">

                          {/*
                           * Use the database invoice UUID.
                           * This avoids treating invoice
                           * numbers as UUIDs.
                           */}

                          <Link
                            href={`/invoices/${invoice.id}`}
                            className="inline-flex rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                          >
                            View
                          </Link>

                        </td>

                      </tr>
                    );
                  }
                )

              )}

            </tbody>

          </table>

        </div>

      </section>

    </main>
  );
}
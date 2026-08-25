import Link from "next/link";

import {
  getInvoiceById,
  getInvoicePayments,
} from "@/services/invoices";

import PrintInvoiceButton from "@/components/PrintInvoiceButton";

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

  return date.toLocaleString(
    "en-GH",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

/* =========================================================
   STATUS
========================================================= */

function getStatus(
  total: number,
  paid: number,
  balance: number
) {
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

  return "Historical";
}

/* =========================================================
   STATUS STYLE
========================================================= */

function statusClass(
  status: string
) {
  if (status === "Paid") {
    return "bg-green-100 text-green-700";
  }

  if (
    status === "Partially Paid"
  ) {
    return "bg-yellow-100 text-yellow-700";
  }

  if (status === "Unpaid") {
    return "bg-red-100 text-red-700";
  }

  return "bg-gray-100 text-gray-600";
}

/* =========================================================
   PAGE
========================================================= */

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

  const invoiceId =
    decodeURIComponent(id);

  /* =======================================================
     LOAD INVOICE
  ======================================================= */

  const invoiceResult =
    await getInvoiceById(
      invoiceId
    );

  /* =======================================================
     ERROR
  ======================================================= */

  if (invoiceResult.error) {
    return (
      <main className="space-y-6 p-6">

        <Link
          href="/invoices/history"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to Invoice History
        </Link>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">

          <h1 className="font-semibold">
            Unable to load invoice
          </h1>

          <p className="mt-1">
            {invoiceResult.error.message}
          </p>

        </div>

      </main>
    );
  }

  /* =======================================================
     INVOICE NOT FOUND
  ======================================================= */

  const invoice =
    invoiceResult.data;

  if (!invoice) {
    return (
      <main className="space-y-6 p-6">

        <Link
          href="/invoices/history"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to Invoice History
        </Link>

        <div className="rounded-xl border bg-white p-8 text-center shadow-sm">

          <h1 className="text-2xl font-bold">
            Invoice Not Found
          </h1>

          <p className="mt-2 text-gray-600">
            The requested invoice could
            not be found.
          </p>

        </div>

      </main>
    );
  }

  /* =======================================================
     PAYMENT HISTORY
  ======================================================= */

  const paymentsResult =
    invoice.sale_id
      ? await getInvoicePayments(
          invoice.sale_id
        )
      : {
          data: [],
          error: null,
        };

  const payments =
    paymentsResult.data || [];

  /* =======================================================
     FINANCIAL VALUES
  ======================================================= */

  const total =
    Number(
      invoice.total_amount || 0
    );

  const paid =
    Number(
      invoice.amount_paid || 0
    );

  const balance =
    Number(
      invoice.balance_due || 0
    );

  const status =
    getStatus(
      total,
      paid,
      balance
    );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="min-h-screen bg-gray-50 p-6">

      {/* ===================================================
          ACTIONS
      =================================================== */}

      <div className="mx-auto mb-6 flex max-w-4xl flex-col justify-between gap-3 md:flex-row md:items-center print:hidden">

        <Link
          href="/invoices/history"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to Invoice History
        </Link>

        <PrintInvoiceButton />

      </div>


      {/* ===================================================
          INVOICE
      =================================================== */}

      <article className="mx-auto max-w-4xl overflow-hidden rounded-xl border bg-white shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="border-b p-8">

          <div className="flex flex-col justify-between gap-6 md:flex-row">

            <div>

              <h1 className="text-3xl font-bold">
                REXY BLOCKS FACTORY
              </h1>

              <p className="mt-2 text-sm text-gray-600">
                Building Materials &
                Construction
              </p>

              <p className="mt-1 text-sm text-gray-600">
                Esaase, Kumasi, Ghana
              </p>

              <p className="mt-1 text-sm text-gray-600">
                Tel: +233 547 831902
              </p>

            </div>

            <div className="text-left md:text-right">

              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Invoice
              </p>

              <p className="mt-1 text-2xl font-bold">
                {invoice.invoice_number}
              </p>

              <p className="mt-2 text-sm text-gray-600">
                {formatDate(
                  invoice.created_at
                )}
              </p>

            </div>

          </div>

        </div>


        {/* =================================================
            CUSTOMER / STATUS
        ================================================= */}

        <div className="grid gap-6 border-b p-8 md:grid-cols-2">

          <div>

            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Bill To
            </h2>

            <p className="mt-2 text-lg font-semibold">
              {invoice.customer_name}
            </p>

          </div>

          <div className="md:text-right">

            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Payment Status
            </h2>

            <span
              className={`mt-2 inline-flex rounded-full px-4 py-1.5 text-sm font-semibold ${statusClass(
                status
              )}`}
            >
              {status}
            </span>

          </div>

        </div>


        {/* =================================================
            INVOICE ITEMS
        ================================================= */}

        <div className="p-8">

          <div className="overflow-hidden rounded-lg border">

            <table className="w-full">

              <thead className="bg-gray-50">

                <tr>

                  <th className="p-4 text-left text-sm font-semibold">
                    Product
                  </th>

                  <th className="p-4 text-right text-sm font-semibold">
                    Quantity
                  </th>

                  <th className="p-4 text-right text-sm font-semibold">
                    Unit Price
                  </th>

                  <th className="p-4 text-right text-sm font-semibold">
                    Amount
                  </th>

                </tr>

              </thead>

              <tbody>

                <tr>

                  <td className="p-4 font-medium">
                    {invoice.product_name ||
                      "N/A"}
                  </td>

                  <td className="p-4 text-right">
                    {invoice.quantity}
                  </td>

                  <td className="p-4 text-right">
                    {money(
                      Number(
                        invoice.unit_price
                      )
                    )}
                  </td>

                  <td className="p-4 text-right font-semibold">
                    {money(total)}
                  </td>

                </tr>

              </tbody>

            </table>

          </div>


          {/* =================================================
              TOTALS
          ================================================= */}

          <div className="mt-8 flex justify-end">

            <div className="w-full max-w-sm space-y-3">

              <div className="flex justify-between gap-6">

                <span className="text-gray-600">
                  Invoice Total
                </span>

                <span className="font-semibold">
                  {money(total)}
                </span>

              </div>

              <div className="flex justify-between gap-6">

                <span className="text-gray-600">
                  Amount Paid
                </span>

                <span className="font-semibold text-green-600">
                  {money(paid)}
                </span>

              </div>

              <div className="border-t pt-3">

                <div className="flex justify-between gap-6">

                  <span className="font-semibold">
                    Balance Due
                  </span>

                  <span
                    className={`text-xl font-bold ${
                      balance > 0
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {money(balance)}
                  </span>

                </div>

              </div>

            </div>

          </div>

        </div>


        {/* =================================================
            PAYMENT INFORMATION
        ================================================= */}

        <div className="border-t bg-gray-50 p-8">

          <h2 className="text-lg font-semibold">
            Payment Information
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3">

            <div>

              <p className="text-sm text-gray-500">
                Payment Method
              </p>

              <p className="mt-1 font-medium">
                {invoice.payment_method ||
                  "—"}
              </p>

            </div>

            <div>

              <p className="text-sm text-gray-500">
                Amount Paid
              </p>

              <p className="mt-1 font-medium text-green-600">
                {money(paid)}
              </p>

            </div>

            <div>

              <p className="text-sm text-gray-500">
                Balance Due
              </p>

              <p className="mt-1 font-medium text-red-600">
                {money(balance)}
              </p>

            </div>

          </div>

        </div>


        {/* =================================================
            PAYMENT HISTORY
        ================================================= */}

        <div className="border-t p-8">

          <h2 className="text-lg font-semibold">
            Payment History
          </h2>

          {payments.length === 0 ? (

            <p className="mt-4 text-sm text-gray-500">
              No separate payment transactions
              have been recorded for this invoice.
            </p>

          ) : (

            <div className="mt-4 overflow-x-auto">

              <table className="w-full text-sm">

                <thead className="border-b bg-gray-50">

                  <tr>

                    <th className="p-3 text-left">
                      Date
                    </th>

                    <th className="p-3 text-left">
                      Method
                    </th>

                    <th className="p-3 text-left">
                      Reference
                    </th>

                    <th className="p-3 text-left">
                      Notes
                    </th>

                    <th className="p-3 text-right">
                      Amount
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {payments.map(
                    (payment) => (
                      <tr
                        key={
                          payment.id
                        }
                        className="border-b last:border-0"
                      >

                        <td className="p-3">
                          {formatDate(
                            payment.created_at
                          )}
                        </td>

                        <td className="p-3">
                          {
                            payment.payment_method
                          }
                        </td>

                        <td className="p-3">
                          {
                            payment.reference ||
                            "—"
                          }
                        </td>

                        <td className="p-3">
                          {
                            payment.notes ||
                            "—"
                          }
                        </td>

                        <td className="p-3 text-right font-semibold text-green-600">
                          {money(
                            Number(
                              payment.amount
                            )
                          )}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>


        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="border-t p-8 text-center">

          <p className="font-semibold">
            Thank you for your business.
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Rexy Blocks Factory
          </p>

          <p className="mt-1 text-xs text-gray-400">
            This invoice was generated from the
            Rexy Blocks Factory management system.
          </p>

        </div>

      </article>

    </main>
  );
}
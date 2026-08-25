"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabase/client";

interface Customer {
  customer_name: string | null;
}

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
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

interface StatementEntry {
  id: string;
  date: string;
  type: "Sale" | "Payment";
  description: string;
  debit: number;
  credit: number;
  balance: number;
  paymentMethod?: string | null;
  reference?: string | null;
  notes?: string | null;
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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDateOnly(value: Date | null) {
  if (!value) {
    return "";
  }

  return value.toLocaleDateString("en-GH", {
    dateStyle: "medium",
  });
}

function CustomerStatementsContent() {
  const searchParams = useSearchParams();

  const customerFromUrl =
    searchParams.get("customer");

  const [customers, setCustomers] =
    useState<string[]>([]);

  const [selectedCustomer, setSelectedCustomer] =
    useState("");

  const [sales, setSales] =
    useState<Sale[]>([]);

  const [payments, setPayments] =
    useState<Payment[]>([]);

  const [loadingCustomers, setLoadingCustomers] =
    useState(true);

  const [loadingStatement, setLoadingStatement] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  /*
   * Keep the statement date in client state.
   *
   * This avoids generating different dates during
   * server/client hydration.
   */
  const [statementDate, setStatementDate] =
    useState<Date | null>(null);

  useEffect(() => {
    setStatementDate(new Date());
  }, []);

  /*
   * Load customer names.
   */
  useEffect(() => {
    loadCustomers();
  }, []);

  /*
   * If Customer Accounts sends us a customer
   * through ?customer=..., automatically open
   * that customer's statement.
   */
  useEffect(() => {
    if (
      customerFromUrl &&
      customers.includes(customerFromUrl)
    ) {
      setSelectedCustomer(customerFromUrl);

      loadStatement(customerFromUrl);
    }
  }, [
    customerFromUrl,
    customers,
  ]);

  async function loadCustomers() {
    setLoadingCustomers(true);
    setErrorMessage("");

    try {
      const {
        data,
        error,
      } = await supabase
        .from("sales")
        .select("customer_name")
        .not(
          "customer_name",
          "is",
          null
        )
        .neq(
          "customer_name",
          ""
        )
        .order(
          "customer_name",
          {
            ascending: true,
          }
        );

      if (error) {
        throw new Error(error.message);
      }

      const uniqueCustomers = [
        ...new Set(
          (data || [])
            .map(
              (row: Customer) =>
                row.customer_name?.trim()
            )
            .filter(
              (
                name
              ): name is string =>
                Boolean(name)
            )
        ),
      ];

      setCustomers(uniqueCustomers);
    } catch (error) {
      console.error(
        "Customer loading error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load customers."
      );
    } finally {
      setLoadingCustomers(false);
    }
  }

  async function loadStatement(
    customerName: string
  ) {
    if (!customerName) {
      setSales([]);
      setPayments([]);
      return;
    }

    setLoadingStatement(true);
    setErrorMessage("");

    try {
      /*
       * --------------------------------------------------------
       * LOAD SALES
       * --------------------------------------------------------
       */

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
        .eq(
          "customer_name",
          customerName
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        );

      if (salesError) {
        throw new Error(
          salesError.message
        );
      }

      const saleRows =
        (salesData || []) as Sale[];

      setSales(saleRows);

      /*
       * --------------------------------------------------------
       * LOAD PAYMENTS
       * --------------------------------------------------------
       */

      const saleIds =
        saleRows.map(
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
            payment_method,
            reference,
            notes,
            created_at
          `
        )
        .in(
          "sale_id",
          saleIds
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        );

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
        "Statement loading error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load customer statement."
      );

      setSales([]);
      setPayments([]);
    } finally {
      setLoadingStatement(false);
    }
  }

  function handleCustomerChange(
    customerName: string
  ) {
    setSelectedCustomer(customerName);

    loadStatement(customerName);
  }

  /*
   * ------------------------------------------------------------
   * BUILD CUSTOMER LEDGER
   *
   * Sales    = Debit
   * Payments = Credit
   * ------------------------------------------------------------
   */

  const statementEntries =
    useMemo(() => {
      const entries: StatementEntry[] =
        [];

      sales.forEach((sale) => {
        entries.push({
          id: `sale-${sale.id}`,
          date: sale.created_at,
          type: "Sale",
          description:
            `${sale.product_name || "Product"} × ${sale.quantity}`,
          debit: Number(
            sale.total_amount || 0
          ),
          credit: 0,
          balance: 0,
        });
      });

      payments.forEach(
        (payment) => {
          const sale =
            sales.find(
              (item) =>
                item.id ===
                payment.sale_id
            );

          entries.push({
            id: `payment-${payment.id}`,
            date: payment.created_at,
            type: "Payment",
            description:
              sale?.product_name
                ? `Payment for ${sale.product_name}`
                : "Customer payment",
            debit: 0,
            credit: Number(
              payment.amount || 0
            ),
            balance: 0,
            paymentMethod:
              payment.payment_method,
            reference:
              payment.reference,
            notes:
              payment.notes,
          });
        }
      );

      /*
       * Sort by actual transaction time.
       */
      entries.sort(
        (a, b) =>
          new Date(a.date).getTime() -
          new Date(b.date).getTime()
      );

      /*
       * Calculate running balance.
       */
      let runningBalance = 0;

      return entries.map(
        (entry) => {
          runningBalance +=
            entry.debit -
            entry.credit;

          return {
            ...entry,
            balance:
              runningBalance,
          };
        }
      );
    }, [
      sales,
      payments,
    ]);

  /*
   * ------------------------------------------------------------
   * SUMMARY
   * ------------------------------------------------------------
   */

  const totalSales =
    useMemo(
      () =>
        sales.reduce(
          (
            sum,
            sale
          ) =>
            sum +
            Number(
              sale.total_amount || 0
            ),
          0
        ),
      [sales]
    );

  const totalPayments =
    useMemo(
      () =>
        payments.reduce(
          (
            sum,
            payment
          ) =>
            sum +
            Number(
              payment.amount || 0
            ),
          0
        ),
      [payments]
    );

  const outstanding =
    Math.max(
      0,
      totalSales -
        totalPayments
    );

  const salesCount =
    sales.length;

  const paymentsCount =
    payments.length;

  const customerStatus =
    outstanding <= 0 &&
    totalSales > 0
      ? "Paid"
      : outstanding > 0
        ? "Owing"
        : "No Sales";

  function printStatement() {
    window.print();
  }

  return (
    <main className="space-y-6 p-6">
      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
        <div>
          <div className="mb-4">
            <Link
              href="/customers/accounts"
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              <span aria-hidden="true">
                ←
              </span>

              Back to Customer Accounts
            </Link>
          </div>

          <h1 className="text-3xl font-bold">
            Customer Statements
          </h1>

          <p className="mt-1 text-gray-600">
            View customer sales,
            payments, and outstanding
            balances.
          </p>
        </div>

        {selectedCustomer && (
          <button
            type="button"
            onClick={printStatement}
            className="rounded-lg bg-black px-4 py-2 font-semibold text-white transition hover:bg-gray-800"
          >
            Print Statement
          </button>
        )}
      </div>

      {/* =====================================================
          CUSTOMER SELECTOR
          ===================================================== */}

      <div className="rounded-lg border bg-white p-5 shadow-sm print:hidden">
        <label
          htmlFor="customer"
          className="mb-2 block text-sm font-semibold"
        >
          Customer
        </label>

        <select
          id="customer"
          value={selectedCustomer}
          onChange={(event) =>
            handleCustomerChange(
              event.target.value
            )
          }
          disabled={loadingCustomers}
          className="w-full rounded-lg border px-3 py-2 outline-none transition focus:ring-2 md:max-w-xl"
        >
          <option value="">
            {loadingCustomers
              ? "Loading customers..."
              : "Select a customer"}
          </option>

          {customers.map(
            (customer) => (
              <option
                key={customer}
                value={customer}
              >
                {customer}
              </option>
            )
          )}
        </select>
      </div>

      {/* =====================================================
          ERROR
          ===================================================== */}

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 print:hidden">
          <p className="font-semibold">
            Statement Error
          </p>

          <p className="mt-1">
            {errorMessage}
          </p>
        </div>
      )}

      {/* =====================================================
          EMPTY STATE
          ===================================================== */}

      {!selectedCustomer &&
        !loadingStatement && (
          <div className="rounded-lg border bg-white p-10 text-center text-gray-500 print:hidden">
            Select a customer to
            view their statement.
          </div>
        )}

      {/* =====================================================
          LOADING
          ===================================================== */}

      {loadingStatement && (
        <div className="rounded-lg border bg-white p-10 text-center print:hidden">
          Loading customer
          statement...
        </div>
      )}

      {/* =====================================================
          CUSTOMER STATEMENT
          ===================================================== */}

      {selectedCustomer &&
        !loadingStatement && (
          <div
            id="customer-statement"
            className="space-y-6"
          >
            {/* PRINT HEADER */}

            <div className="hidden print:block">
              <div className="border-b pb-4">
                <h1 className="text-3xl font-bold">
                  Rexy Blocks Factory
                </h1>

                <p>
                  Esaase, Kumasi,
                  Ghana
                </p>

                <p>
                  Customer
                  Statement
                </p>
              </div>
            </div>

            {/* CUSTOMER INFORMATION */}

            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Customer
                  </p>

                  <h2 className="text-2xl font-bold">
                    {selectedCustomer}
                  </h2>

                  <p className="mt-1 text-gray-500">
                    Rexy Blocks
                    Factory
                  </p>
                </div>

                <div className="text-left md:text-right">
                  <p className="text-sm text-gray-500">
                    Statement Date
                  </p>

                  <p className="font-semibold">
                    {formatDateOnly(
                      statementDate
                    )}
                  </p>

                  <div className="mt-2">
                    {customerStatus ===
                    "Owing" ? (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                        Owing
                      </span>
                    ) : customerStatus ===
                      "Paid" ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        Paid
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        No Sales
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SUMMARY CARDS */}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">
                  Total Sales
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {money(totalSales)}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {salesCount}{" "}
                  sale
                  {salesCount ===
                  1
                    ? ""
                    : "s"}
                </p>
              </div>

              <div className="rounded-lg border bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">
                  Total Payments
                </p>

                <p className="mt-2 text-2xl font-bold text-green-600">
                  {money(
                    totalPayments
                  )}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {paymentsCount}{" "}
                  payment
                  {paymentsCount ===
                  1
                    ? ""
                    : "s"}
                </p>
              </div>

              <div className="rounded-lg border bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">
                  Outstanding Balance
                </p>

                <p className="mt-2 text-2xl font-bold text-red-600">
                  {money(
                    outstanding
                  )}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Current amount
                  owing
                </p>
              </div>
            </div>

            {/* =================================================
                LEDGER
                ================================================= */}

            <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="whitespace-nowrap border-b p-3 text-left text-sm font-semibold">
                      Date
                    </th>

                    <th className="border-b p-3 text-left text-sm font-semibold">
                      Description
                    </th>

                    <th className="border-b p-3 text-left text-sm font-semibold">
                      Type
                    </th>

                    <th className="border-b p-3 text-left text-sm font-semibold">
                      Payment Method
                    </th>

                    <th className="border-b p-3 text-right text-sm font-semibold">
                      Debit
                    </th>

                    <th className="border-b p-3 text-right text-sm font-semibold">
                      Credit
                    </th>

                    <th className="border-b p-3 text-right text-sm font-semibold">
                      Balance
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {statementEntries.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-8 text-center text-gray-500"
                      >
                        No transactions
                        found for
                        this customer.
                      </td>
                    </tr>
                  ) : (
                    statementEntries.map(
                      (entry) => (
                        <tr
                          key={
                            entry.id
                          }
                          className="border-b last:border-b-0"
                        >
                          <td className="whitespace-nowrap p-3 text-sm">
                            {formatDate(
                              entry.date
                            )}
                          </td>

                          <td className="p-3">
                            <div>
                              {
                                entry.description
                              }
                            </div>

                            {entry.reference && (
                              <div className="text-xs text-gray-500">
                                Ref:{" "}
                                {
                                  entry.reference
                                }
                              </div>
                            )}

                            {entry.notes && (
                              <div className="text-xs text-gray-500">
                                {
                                  entry.notes
                                }
                              </div>
                            )}
                          </td>

                          <td className="p-3">
                            {entry.type ===
                            "Sale" ? (
                              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                                Sale
                              </span>
                            ) : (
                              <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                                Payment
                              </span>
                            )}
                          </td>

                          <td className="p-3">
                            {entry.type ===
                            "Payment"
                              ? entry.paymentMethod ||
                                "—"
                              : "—"}
                          </td>

                          <td className="whitespace-nowrap p-3 text-right">
                            {entry.debit >
                            0
                              ? money(
                                  entry.debit
                                )
                              : "—"}
                          </td>

                          <td className="whitespace-nowrap p-3 text-right">
                            {entry.credit >
                            0
                              ? money(
                                  entry.credit
                                )
                              : "—"}
                          </td>

                          <td className="whitespace-nowrap p-3 text-right font-semibold">
                            {money(
                              entry.balance
                            )}
                          </td>
                        </tr>
                      )
                    )
                  )}
                </tbody>

                {/* TOTALS */}

                {statementEntries.length >
                  0 && (
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td
                        colSpan={4}
                        className="p-3 text-right font-bold"
                      >
                        Totals
                      </td>

                      <td className="whitespace-nowrap p-3 text-right font-bold">
                        {money(
                          totalSales
                        )}
                      </td>

                      <td className="whitespace-nowrap p-3 text-right font-bold text-green-600">
                        {money(
                          totalPayments
                        )}
                      </td>

                      <td className="whitespace-nowrap p-3 text-right font-bold text-red-600">
                        {money(
                          outstanding
                        )}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* =================================================
                BALANCE NOTICE
                ================================================= */}

            <div
              className={`rounded-lg border p-5 ${
                outstanding > 0
                  ? "border-red-200 bg-red-50"
                  : "border-green-200 bg-green-50"
              }`}
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">
                    {outstanding >
                    0
                      ? "Amount Outstanding"
                      : "Account Paid"}
                  </p>

                  <p className="text-sm text-gray-600">
                    {outstanding >
                    0
                      ? "This is the current amount owed by the customer."
                      : "This customer's account has no outstanding balance."}
                  </p>
                </div>

                <p className="text-2xl font-bold">
                  {money(
                    outstanding
                  )}
                </p>
              </div>
            </div>

            {/* =================================================
                PRINT FOOTER
                ================================================= */}

            <div className="hidden border-t pt-6 text-sm text-gray-500 print:block">
              <p>
                Thank you for doing
                business with Rexy
                Blocks Factory.
              </p>

              <p className="mt-1">
                This statement is
                generated from the
                transaction records
                in the Rexy Blocks
                Factory management
                system.
              </p>
            </div>
          </div>
        )}

      {/* =====================================================
          PRINT STYLES
          ===================================================== */}

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

          #customer-statement {
            width: 100%;
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

/*
 * ------------------------------------------------------------
 * SUSPENSE BOUNDARY
 *
 * useSearchParams() requires a Suspense boundary
 * during production builds in Next.js.
 * ------------------------------------------------------------
 */

export default function CustomerStatementsPage() {
  return (
    <Suspense
      fallback={
        <main className="space-y-6 p-6">
          <div className="rounded-lg border bg-white p-10 text-center text-gray-500">
            Loading customer statements...
          </div>
        </main>
      }
    >
      <CustomerStatementsContent />
    </Suspense>
  );
}
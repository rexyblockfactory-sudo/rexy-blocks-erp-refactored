"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface Payment {
  id: string;
  sale_id: string;
  amount: number;
  payment_method: string;
  reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;

  customer_name?: string;
  product_name?: string;
}

interface Sale {
  id: string;
  customer_name: string | null;
  product_name: string | null;
}

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    setLoading(true);
    setErrorMessage("");

    try {
      /*
       * First load payments directly.
       *
       * We intentionally do NOT use:
       *
       * sales(...)
       *
       * in this query because the payment table may not
       * have the PostgREST relationship exposed correctly.
       */
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
            created_by,
            created_at
          `
        )
        .order("created_at", {
          ascending: false,
        });

      console.log(
        "PAYMENT HISTORY DATA:",
        paymentData
      );

      console.log(
        "PAYMENT HISTORY ERROR:",
        paymentError
      );

      if (paymentError) {
        throw new Error(
          paymentError.message
        );
      }

      if (!paymentData || paymentData.length === 0) {
        setPayments([]);
        return;
      }

      /*
       * Get the sale IDs associated with the payments.
       */
      const saleIds = [
        ...new Set(
          paymentData
            .map(
              (payment) =>
                payment.sale_id
            )
            .filter(Boolean)
        ),
      ];

      /*
       * Load the corresponding sales separately.
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
            product_name
          `
        )
        .in("id", saleIds);

      console.log(
        "PAYMENT HISTORY SALES:",
        salesData
      );

      console.log(
        "PAYMENT HISTORY SALES ERROR:",
        salesError
      );

      if (salesError) {
        throw new Error(
          salesError.message
        );
      }

      const salesMap =
        new Map<string, Sale>();

      (salesData || []).forEach(
        (sale) => {
          salesMap.set(
            sale.id,
            sale
          );
        }
      );

      /*
       * Combine payment records with their
       * corresponding sale information.
       */
      const combinedPayments =
        paymentData.map(
          (payment) => {
            const sale =
              salesMap.get(
                payment.sale_id
              );

            return {
              ...payment,
              customer_name:
                sale?.customer_name ||
                "N/A",
              product_name:
                sale?.product_name ||
                "N/A",
            };
          }
        );

      setPayments(
        combinedPayments
      );
    } catch (error) {
      console.error(
        "Payment history exception:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load payment history."
      );
    } finally {
      setLoading(false);
    }
  }

  const totalPayments =
    payments.length;

  const totalCollected =
    payments.reduce(
      (sum, payment) =>
        sum +
        Number(
          payment.amount || 0
        ),
      0
    );

  return (
    <main className="space-y-6 p-6">

      {/* Header */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h1 className="text-3xl font-bold">
            Payment History
          </h1>

          <p className="mt-1 text-gray-600">
            View all customer payments
            recorded in the system.
          </p>
        </div>

        <button
          type="button"
          onClick={loadPayments}
          disabled={loading}
          className="rounded-lg border bg-white px-4 py-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Loading..."
            : "Refresh"}
        </button>

      </div>

      {/* Error */}

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-semibold">
            Payment History Error
          </p>

          <p className="mt-1">
            {errorMessage}
          </p>
        </div>
      )}

      {/* Summary Cards */}

      <div className="grid gap-4 md:grid-cols-2">

        <div className="rounded-lg border bg-white p-5 shadow-sm">

          <p className="text-sm font-medium text-gray-500">
            Total Payments
          </p>

          <p className="mt-2 text-3xl font-bold">
            {totalPayments}
          </p>

        </div>

        <div className="rounded-lg border bg-white p-5 shadow-sm">

          <p className="text-sm font-medium text-gray-500">
            Total Collected
          </p>

          <p className="mt-2 text-3xl font-bold">
            GH₵
            {totalCollected.toLocaleString(
              "en-GH",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}
          </p>

        </div>

      </div>

      {/* Table */}

      {loading ? (

        <div className="rounded-lg border bg-white p-10 text-center">
          Loading payment history...
        </div>

      ) : (

        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">

          <table className="min-w-full">

            <thead className="bg-gray-50">

              <tr>

                <th className="whitespace-nowrap border-b p-3 text-left text-sm font-semibold">
                  Date
                </th>

                <th className="whitespace-nowrap border-b p-3 text-left text-sm font-semibold">
                  Customer
                </th>

                <th className="whitespace-nowrap border-b p-3 text-left text-sm font-semibold">
                  Product
                </th>

                <th className="whitespace-nowrap border-b p-3 text-left text-sm font-semibold">
                  Amount
                </th>

                <th className="whitespace-nowrap border-b p-3 text-left text-sm font-semibold">
                  Payment Method
                </th>

                <th className="whitespace-nowrap border-b p-3 text-left text-sm font-semibold">
                  Reference
                </th>

                <th className="whitespace-nowrap border-b p-3 text-left text-sm font-semibold">
                  Notes
                </th>

              </tr>

            </thead>

            <tbody>

              {payments.length === 0 ? (

                <tr>

                  <td
                    colSpan={7}
                    className="p-10 text-center text-gray-500"
                  >
                    No payments have been
                    recorded.
                  </td>

                </tr>

              ) : (

                payments.map(
                  (payment) => (
                    <tr
                      key={payment.id}
                      className="border-b last:border-b-0 hover:bg-gray-50"
                    >

                      <td className="whitespace-nowrap p-3 text-sm">
                        {new Date(
                          payment.created_at
                        ).toLocaleString(
                          "en-GH",
                          {
                            dateStyle:
                              "medium",
                            timeStyle:
                              "short",
                          }
                        )}
                      </td>

                      <td className="p-3 font-medium">
                        {payment.customer_name ||
                          "N/A"}
                      </td>

                      <td className="p-3">
                        {payment.product_name ||
                          "N/A"}
                      </td>

                      <td className="whitespace-nowrap p-3 font-semibold">
                        GH₵
                        {Number(
                          payment.amount
                        ).toLocaleString(
                          "en-GH",
                          {
                            minimumFractionDigits:
                              2,
                            maximumFractionDigits:
                              2,
                          }
                        )}
                      </td>

                      <td className="p-3">
                        {payment.payment_method ||
                          "N/A"}
                      </td>

                      <td className="p-3">
                        {payment.reference ||
                          "—"}
                      </td>

                      <td className="p-3">
                        {payment.notes ||
                          "—"}
                      </td>

                    </tr>
                  )
                )

              )}

            </tbody>

          </table>

        </div>

      )}

    </main>
  );
}
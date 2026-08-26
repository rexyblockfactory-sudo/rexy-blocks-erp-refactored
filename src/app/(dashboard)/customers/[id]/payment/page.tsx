"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase/client";
import { recordSalePayment } from "@/services/sales";

interface Customer {
  id: string;
  customer_name: string;
  phone: string | null;
  address: string | null;
  customer_type: string | null;
}

interface Sale {
  id: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: string;
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

function money(value: number) {
  return `GH₵${Number(value || 0).toLocaleString(
    "en-GH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-GH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function CustomerPaymentPage() {
  const params = useParams();
  const router = useRouter();

  const customerId =
    typeof params?.id === "string"
      ? params.id
      : "";

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [sales, setSales] =
    useState<Sale[]>([]);

  const [payments, setPayments] =
    useState<Payment[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [selectedSaleId, setSelectedSaleId] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("Cash");

  const [reference, setReference] =
    useState("");

  const [notes, setNotes] =
    useState("");

  useEffect(() => {
    if (!customerId) {
      setErrorMessage(
        "Customer ID is missing."
      );

      setLoading(false);
      return;
    }

    loadCustomerAccount();
  }, [customerId]);

  async function loadCustomerAccount() {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      /*
       * --------------------------------------------------------
       * CUSTOMER
       * --------------------------------------------------------
       */

      const {
        data: customerData,
        error: customerError,
      } = await supabase
        .from("customers")
        .select(
          `
            id,
            customer_name,
            phone,
            address,
            customer_type
          `
        )
        .eq("id", customerId)
        .single();

      if (customerError) {
        throw new Error(
          `Customer: ${customerError.message}`
        );
      }

      if (!customerData) {
        throw new Error(
          "Customer was not found."
        );
      }

      const loadedCustomer =
        customerData as Customer;

      setCustomer(loadedCustomer);

      /*
       * --------------------------------------------------------
       * SALES
       *
       * Sales are associated with the customer
       * through customer_name in the current system.
       * --------------------------------------------------------
       */

      const {
        data: salesData,
        error: salesError,
      } = await supabase
        .from("sales")
        .select("*")
        .eq(
          "customer_name",
          loadedCustomer.customer_name
        )
        .order("created_at", {
          ascending: false,
        });

      if (salesError) {
        throw new Error(
          `Sales: ${salesError.message}`
        );
      }

      /*
       * Calculate effective balances rather than
       * trusting historical balance_due values.
       */

      const normalizedSales =
        (salesData || [])
          .map((sale) => {
            const total =
              Number(
                sale.total_amount || 0
              );

            const paid =
              Number(
                sale.amount_paid || 0
              );

            const balance = Math.max(
              0,
              total - paid
            );

            return {
              ...(sale as Sale),
              amount_paid: paid,
              balance_due: balance,
            };
          });

      setSales(normalizedSales);

      /*
       * --------------------------------------------------------
       * PAYMENT HISTORY
       *
       * Load payments separately to avoid depending
       * on a PostgREST relationship.
       * --------------------------------------------------------
       */

      const saleIds =
        normalizedSales.map(
          (sale) => sale.id
        );

      if (saleIds.length > 0) {
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
          .in("sale_id", saleIds)
          .order("created_at", {
            ascending: false,
          });

        if (paymentError) {
          throw new Error(
            `Payments: ${paymentError.message}`
          );
        }

        setPayments(
          (paymentData || []) as Payment[]
        );
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error(
        "Customer payment page error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load customer account."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ------------------------------------------------------------
   * OUTSTANDING SALES
   * ------------------------------------------------------------
   */

  const outstandingSales =
    useMemo(() => {
      return sales.filter(
        (sale) =>
          Number(sale.balance_due) >
          0
      );
    }, [sales]);

  /*
   * ------------------------------------------------------------
   * SUMMARY
   * ------------------------------------------------------------
   */

  const totalSales = useMemo(
    () =>
      sales.reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.total_amount || 0
          ),
        0
      ),
    [sales]
  );

  const totalPaid = useMemo(
    () =>
      sales.reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.amount_paid || 0
          ),
        0
      ),
    [sales]
  );

  const totalOutstanding = useMemo(
    () =>
      sales.reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.balance_due || 0
          ),
        0
      ),
    [sales]
  );

  const selectedSale =
    sales.find(
      (sale) =>
        sale.id === selectedSaleId
    ) || null;

  /*
   * ------------------------------------------------------------
   * SELECT SALE
   * ------------------------------------------------------------
   */

  function handleSaleChange(
    saleId: string
  ) {
    setSelectedSaleId(saleId);
    setErrorMessage("");
    setSuccessMessage("");

    const sale = sales.find(
      (item) => item.id === saleId
    );

    if (sale) {
      setAmount(
        Number(
          sale.balance_due || 0
        ).toFixed(2)
      );
    } else {
      setAmount("");
    }
  }

  /*
   * ------------------------------------------------------------
   * RECORD PAYMENT
   * ------------------------------------------------------------
   */

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!selectedSale) {
      setErrorMessage(
        "Please select an outstanding sale."
      );

      return;
    }

    const paymentAmount =
      Number(amount);

    if (
      !Number.isFinite(
        paymentAmount
      ) ||
      paymentAmount <= 0
    ) {
      setErrorMessage(
        "Enter a valid payment amount greater than zero."
      );

      return;
    }

    const outstanding =
      Number(
        selectedSale.balance_due || 0
      );

    if (paymentAmount > outstanding + 0.005) {
      setErrorMessage(
        `Payment cannot exceed the outstanding balance of ${money(
          outstanding
        )}.`
      );

      return;
    }

    if (!paymentMethod.trim()) {
      setErrorMessage(
        "Payment method is required."
      );

      return;
    }

    setSaving(true);

    try {
      const {
        data,
        error,
      } = await recordSalePayment(
        selectedSale.id,
        paymentAmount,
        paymentMethod,
        reference || null,
        notes || null
      );

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error(
          "Payment was not returned by the database."
        );
      }

      setSuccessMessage(
        `Payment of ${money(
          paymentAmount
        )} was recorded successfully.`
      );

      setAmount("");
      setReference("");
      setNotes("");
      setSelectedSaleId("");

      /*
       * Reload everything so the updated
       * balance is immediately visible.
       */
      await loadCustomerAccount();
    } catch (error) {
      console.error(
        "Record payment error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to record payment."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * ------------------------------------------------------------
   * LOADING
   * ------------------------------------------------------------
   */

  if (loading) {
    return (
      <main className="space-y-6 p-6">
        <div className="rounded-lg border bg-white p-10 text-center">
          Loading customer account...
        </div>
      </main>
    );
  }

  /*
   * ------------------------------------------------------------
   * ERROR / CUSTOMER NOT FOUND
   * ------------------------------------------------------------
   */

  if (!customer) {
    return (
      <main className="space-y-6 p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          <h1 className="text-xl font-bold">
            Customer Not Found
          </h1>

          <p className="mt-2">
            {errorMessage ||
              "The requested customer could not be found."}
          </p>
        </div>

        <Link
          href="/customers/accounts"
          className="inline-flex rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
        >
          Back to Customer Accounts
        </Link>
      </main>
    );
  }

  /*
   * ------------------------------------------------------------
   * RENDER
   * ------------------------------------------------------------
   */

  return (
    <main className="space-y-6 p-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link
            href="/customers/accounts"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Customer Accounts
          </Link>

          <h1 className="mt-2 text-3xl font-bold">
            Record Customer Payment
          </h1>

          <p className="mt-1 text-gray-600">
            Record a payment against an
            outstanding customer sale.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/customers/statements?customer=${encodeURIComponent(
              customer.customer_name
            )}`}
            className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Customer Statement
          </Link>

          <Link
            href="/payments/history"
            className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Payment History
          </Link>
        </div>
      </div>

      {/* CUSTOMER INFORMATION */}

      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm text-gray-500">
              Customer
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              {customer.customer_name}
            </h2>

            {customer.phone && (
              <p className="mt-1 text-sm text-gray-600">
                {customer.phone}
              </p>
            )}

            {customer.address && (
              <p className="mt-1 text-sm text-gray-600">
                {customer.address}
              </p>
            )}
          </div>

          {customer.customer_type && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium">
              {customer.customer_type}
            </span>
          )}
        </div>
      </section>

      {/* SUMMARY */}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Sales
          </p>

          <p className="mt-2 text-2xl font-bold">
            {money(totalSales)}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Paid
          </p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {money(totalPaid)}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Outstanding Balance
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {money(totalOutstanding)}
          </p>
        </div>
      </div>

      {/* SUCCESS */}

      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          <p className="font-semibold">
            Payment Successful
          </p>

          <p className="mt-1 text-sm">
            {successMessage}
          </p>
        </div>
      )}

      {/* ERROR */}

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-semibold">
            Payment Error
          </p>

          <p className="mt-1 text-sm">
            {errorMessage}
          </p>
        </div>
      )}

      {/* PAYMENT FORM */}

      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-bold">
            Record Payment
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Select an outstanding sale and
            enter the amount received.
          </p>
        </div>

        {outstandingSales.length ===
        0 ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-green-700">
            <p className="font-semibold">
              No outstanding balance
            </p>

            <p className="mt-1 text-sm">
              This customer currently has
              no outstanding sales requiring
              payment.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* SALE */}

            <div>
              <label
                htmlFor="sale"
                className="mb-2 block text-sm font-semibold"
              >
                Outstanding Sale
              </label>

              <select
                id="sale"
                value={selectedSaleId}
                onChange={(event) =>
                  handleSaleChange(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
                disabled={saving}
              >
                <option value="">
                  Select outstanding sale
                </option>

                {outstandingSales.map(
                  (sale) => (
                    <option
                      key={sale.id}
                      value={sale.id}
                    >
                      {formatDate(
                        sale.created_at
                      )}{" "}
                      —{" "}
                      {sale.product_name}{" "}
                      —{" "}
                      Balance{" "}
                      {money(
                        sale.balance_due
                      )}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* SELECTED SALE DETAILS */}

            {selectedSale && (
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-gray-500">
                      Product
                    </p>

                    <p className="mt-1 font-semibold">
                      {
                        selectedSale.product_name
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Sale Date
                    </p>

                    <p className="mt-1 font-semibold">
                      {formatDate(
                        selectedSale.created_at
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Sale Total
                    </p>

                    <p className="mt-1 font-semibold">
                      {money(
                        selectedSale.total_amount
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Outstanding
                    </p>

                    <p className="mt-1 font-bold text-red-600">
                      {money(
                        selectedSale.balance_due
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* AMOUNT */}

            <div>
              <label
                htmlFor="amount"
                className="mb-2 block text-sm font-semibold"
              >
                Payment Amount
              </label>

              <input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) =>
                  setAmount(
                    event.target.value
                  )
                }
                placeholder="0.00"
                disabled={saving}
                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
              />

              {selectedSale && (
                <p className="mt-1 text-xs text-gray-500">
                  Maximum payment:{" "}
                  <span className="font-semibold">
                    {money(
                      selectedSale.balance_due
                    )}
                  </span>
                </p>
              )}
            </div>

            {/* PAYMENT METHOD */}

            <div>
              <label
                htmlFor="payment-method"
                className="mb-2 block text-sm font-semibold"
              >
                Payment Method
              </label>

              <select
                id="payment-method"
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(
                    event.target.value
                  )
                }
                disabled={saving}
                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
              >
                <option value="Cash">
                  Cash
                </option>

                <option value="Mobile Money">
                  Mobile Money
                </option>

                <option value="Bank Transfer">
                  Bank Transfer
                </option>

                <option value="Cheque">
                  Cheque
                </option>

                <option value="Card">
                  Card
                </option>

                <option value="Other">
                  Other
                </option>
              </select>
            </div>

            {/* REFERENCE */}

            <div>
              <label
                htmlFor="reference"
                className="mb-2 block text-sm font-semibold"
              >
                Reference
                <span className="ml-1 font-normal text-gray-400">
                  (optional)
                </span>
              </label>

              <input
                id="reference"
                type="text"
                value={reference}
                onChange={(event) =>
                  setReference(
                    event.target.value
                  )
                }
                placeholder="Receipt number, transaction ID, cheque number..."
                disabled={saving}
                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
              />
            </div>

            {/* NOTES */}

            <div>
              <label
                htmlFor="notes"
                className="mb-2 block text-sm font-semibold"
              >
                Notes
                <span className="ml-1 font-normal text-gray-400">
                  (optional)
                </span>
              </label>

              <textarea
                id="notes"
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value
                  )
                }
                placeholder="Additional payment notes..."
                rows={3}
                disabled={saving}
                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
              />
            </div>

            {/* BUTTONS */}

            <div className="flex flex-wrap gap-3 border-t pt-5">
              <button
                type="submit"
                disabled={
                  saving ||
                  !selectedSaleId ||
                  !amount
                }
                className="rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Recording Payment..."
                  : "Record Payment"}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setSelectedSaleId("");
                  setAmount("");
                  setReference("");
                  setNotes("");
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                className="rounded-lg border bg-white px-5 py-2.5 font-semibold hover:bg-gray-50 disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </form>
        )}
      </section>

      {/* OUTSTANDING SALES */}

      <section className="rounded-lg border bg-white shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-xl font-bold">
            Outstanding Sales
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Sales that still have an amount
            due.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="border-b p-3 text-left text-sm font-semibold">
                  Date
                </th>

                <th className="border-b p-3 text-left text-sm font-semibold">
                  Product
                </th>

                <th className="border-b p-3 text-right text-sm font-semibold">
                  Quantity
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

                <th className="border-b p-3 text-center text-sm font-semibold">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {outstandingSales.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-gray-500"
                  >
                    No outstanding sales.
                  </td>
                </tr>
              ) : (
                outstandingSales.map(
                  (sale) => (
                    <tr
                      key={sale.id}
                      className="border-b last:border-b-0 hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap p-3 text-sm">
                        {formatDate(
                          sale.created_at
                        )}
                      </td>

                      <td className="p-3 font-medium">
                        {sale.product_name}
                      </td>

                      <td className="p-3 text-right">
                        {Number(
                          sale.quantity
                        ).toLocaleString(
                          "en-GH"
                        )}
                      </td>

                      <td className="whitespace-nowrap p-3 text-right">
                        {money(
                          sale.total_amount
                        )}
                      </td>

                      <td className="whitespace-nowrap p-3 text-right text-green-600">
                        {money(
                          sale.amount_paid
                        )}
                      </td>

                      <td className="whitespace-nowrap p-3 text-right font-bold text-red-600">
                        {money(
                          sale.balance_due
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            handleSaleChange(
                              sale.id
                            )
                          }
                          className="rounded-md border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* PAYMENT HISTORY */}

      <section className="rounded-lg border bg-white shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-xl font-bold">
            Customer Payment History
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Payments recorded against this
            customer's sales.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="border-b p-3 text-left text-sm font-semibold">
                  Date
                </th>

                <th className="border-b p-3 text-right text-sm font-semibold">
                  Amount
                </th>

                <th className="border-b p-3 text-left text-sm font-semibold">
                  Method
                </th>

                <th className="border-b p-3 text-left text-sm font-semibold">
                  Reference
                </th>

                <th className="border-b p-3 text-left text-sm font-semibold">
                  Notes
                </th>
              </tr>
            </thead>

            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-gray-500"
                  >
                    No payments recorded
                    for this customer.
                  </td>
                </tr>
              ) : (
                payments.map(
                  (payment) => (
                    <tr
                      key={payment.id}
                      className="border-b last:border-b-0"
                    >
                      <td className="whitespace-nowrap p-3 text-sm">
                        {formatDate(
                          payment.created_at
                        )}
                      </td>

                      <td className="whitespace-nowrap p-3 text-right font-semibold text-green-600">
                        {money(
                          payment.amount
                        )}
                      </td>

                      <td className="p-3">
                        {payment.payment_method ||
                          "—"}
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
      </section>
    </main>
  );
}
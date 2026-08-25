"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Sale } from "@/types/sale";

type PaymentMethod =
  | "Cash"
  | "Mobile Money"
  | "Bank Transfer"
  | "Credit";

interface PaymentForm {
  amount: string;
  paymentMethod: PaymentMethod;
  reference: string;
  notes: string;
}

interface Summary {
  totalSales: number;
  totalPaid: number;
  totalOutstanding: number;
  customersOwing: number;
  outstandingSales: number;
}

const EMPTY_PAYMENT: PaymentForm = {
  amount: "",
  paymentMethod: "Cash",
  reference: "",
  notes: "",
};

function money(value: number) {
  return `GH₵${Number(value || 0).toLocaleString(
    "en-GH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function effectiveAmounts(sale: Sale) {
  const total = Number(sale.total_amount || 0);
  const paid = Number(sale.amount_paid || 0);

  const balance = Math.max(0, total - paid);

  return {
    total,
    paid,
    balance,
  };
}

function getStatus(sale: Sale) {
  const { paid, balance } = effectiveAmounts(sale);

  if (balance <= 0) {
    return "Paid";
  }

  if (paid > 0) {
    return "Partially Paid";
  }

  return "Unpaid";
}

export default function ReceivablesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [selectedSale, setSelectedSale] =
    useState<Sale | null>(null);

  const [payment, setPayment] =
    useState<PaymentForm>(EMPTY_PAYMENT);

  async function loadSales() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Receivables loading error:",
        error
      );

      setErrorMessage(error.message);
      setSales([]);
      setLoading(false);
      return;
    }

    setSales((data || []) as Sale[]);
    setLoading(false);
  }

  useEffect(() => {
    loadSales();
  }, []);

  const outstandingSales = useMemo(() => {
    return sales
      .map((sale) => {
        const amounts = effectiveAmounts(sale);

        return {
          ...sale,
          amount_paid: amounts.paid,
          balance_due: amounts.balance,
        };
      })
      .filter(
        (sale) => Number(sale.balance_due || 0) > 0
      );
  }, [sales]);

  const summary = useMemo<Summary>(() => {
    let totalSales = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    const customers = new Set<string>();

    for (const sale of sales) {
      const {
        total,
        paid,
        balance,
      } = effectiveAmounts(sale);

      totalSales += total;
      totalPaid += paid;
      totalOutstanding += balance;

      if (balance > 0) {
        const customer =
          sale.customer_name?.trim();

        customers.add(
          customer || "N/A"
        );
      }
    }

    return {
      totalSales,
      totalPaid,
      totalOutstanding,
      customersOwing: customers.size,
      outstandingSales:
        outstandingSales.length,
    };
  }, [sales, outstandingSales.length]);

  function openPayment(sale: Sale) {
    setSelectedSale(sale);
    setPayment({
      ...EMPTY_PAYMENT,
      amount: "",
    });

    setErrorMessage("");
    setSuccessMessage("");
  }

  function closePayment() {
    if (saving) return;

    setSelectedSale(null);
    setPayment(EMPTY_PAYMENT);
  }

 async function submitPayment(
  event: React.FormEvent<HTMLFormElement>
) {
  event.preventDefault();

  if (!selectedSale) {
    return;
  }

  setErrorMessage("");
  setSuccessMessage("");

  const amount = Number(payment.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    setErrorMessage(
      "Payment amount must be greater than zero."
    );
    return;
  }

  if (!payment.paymentMethod) {
    setErrorMessage(
      "Please select a payment method."
    );
    return;
  }

  setSaving(true);

  try {
    /*
     * IMPORTANT:
     * Reload the sale from Supabase immediately before
     * recording the payment. This prevents stale browser
     * data from causing an incorrect "no outstanding
     * balance" message.
     */
    const {
      data: currentSale,
      error: saleError,
    } = await supabase
      .from("sales")
      .select(
        "id, customer_name, product_name, total_amount, amount_paid, balance_due"
      )
      .eq("id", selectedSale.id)
      .single();

    if (saleError) {
      console.error(
        "Could not reload sale:",
        saleError
      );

      throw new Error(
        saleError.message
      );
    }

    if (!currentSale) {
      throw new Error(
        "Sale could not be found."
      );
    }

    const total = Number(
      currentSale.total_amount || 0
    );

    const paid = Number(
      currentSale.amount_paid || 0
    );

    /*
     * Always calculate the effective balance from:
     *
     * total - amount_paid
     *
     * because some historical records have an
     * incorrect balance_due value of zero.
     */
    const balance = Math.max(
      0,
      total - paid
    );

    console.log(
      "CURRENT SALE BEFORE PAYMENT:",
      {
        id: currentSale.id,
        total,
        paid,
        balance,
        requestedPayment: amount,
      }
    );

    if (balance <= 0) {
      throw new Error(
        "This sale has no outstanding balance."
      );
    }

    if (amount > balance + 0.005) {
      throw new Error(
        `Payment cannot exceed the outstanding balance of GH₵${balance.toLocaleString(
          "en-GH",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        )}.`
      );
    }

    /*
     * Call the existing Supabase RPC.
     */
    const { data, error } =
      await supabase.rpc(
        "record_sale_payment",
        {
          p_sale_id: currentSale.id,
          p_amount: amount,
          p_payment_method:
            payment.paymentMethod,
          p_reference:
            payment.reference.trim() ||
            null,
          p_notes:
            payment.notes.trim() ||
            null,
        }
      );

    console.log(
      "RECORD PAYMENT RESULT:",
      data
    );

    if (error) {
      console.error(
        "Payment RPC error:",
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }
      );

      throw new Error(
        error.message ||
          "Failed to record payment."
      );
    }

    const newPaid =
      paid + amount;

    const newBalance =
      Math.max(
        0,
        total - newPaid
      );

    setSuccessMessage(
      `Payment of GH₵${amount.toLocaleString(
        "en-GH",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      )} recorded successfully. ` +
        `Paid: GH₵${newPaid.toLocaleString(
          "en-GH",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        )}. ` +
        `Balance: GH₵${newBalance.toLocaleString(
          "en-GH",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        )}.`
    );

    setSelectedSale(null);
    setPayment(EMPTY_PAYMENT);

    /*
     * Reload the complete receivables list.
     */
    await loadSales();
  } catch (error) {
    console.error(
      "Payment error:",
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

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">
          Accounts Receivable
        </h1>

        <p className="mt-1 text-gray-600">
          Track outstanding customer balances
          and payments.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          {successMessage}
        </div>
      )}

      {/* SUMMARY */}

      <div className="grid gap-4 md:grid-cols-5">
        <SummaryCard
          title="Total Sales"
          value={money(summary.totalSales)}
        />

        <SummaryCard
          title="Total Paid"
          value={money(summary.totalPaid)}
        />

        <SummaryCard
          title="Outstanding"
          value={money(
            summary.totalOutstanding
          )}
        />

        <SummaryCard
          title="Customers Owing"
          value={String(
            summary.customersOwing
          )}
        />

        <SummaryCard
          title="Outstanding Sales"
          value={String(
            summary.outstandingSales
          )}
        />
      </div>

      {/* TABLE */}

      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="p-3 text-left">
                  Customer
                </th>

                <th className="p-3 text-left">
                  Product
                </th>

                <th className="p-3 text-left">
                  Qty
                </th>

                <th className="p-3 text-left">
                  Total
                </th>

                <th className="p-3 text-left">
                  Paid
                </th>

                <th className="p-3 text-left">
                  Balance
                </th>

                <th className="p-3 text-left">
                  Status
                </th>

                <th className="p-3 text-left">
                  Date
                </th>

                <th className="p-3 text-left">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-8 text-center text-gray-500"
                  >
                    Loading receivables...
                  </td>
                </tr>
              ) : outstandingSales.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-8 text-center text-gray-500"
                  >
                    No outstanding customer
                    balances.
                  </td>
                </tr>
              ) : (
                outstandingSales.map(
                  (sale) => {
                    const amounts =
                      effectiveAmounts(
                        sale
                      );

                    return (
                      <tr
                        key={sale.id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="p-3 font-medium">
                          {sale.customer_name?.trim() ||
                            "N/A"}
                        </td>

                        <td className="p-3">
                          {sale.product_name}
                        </td>

                        <td className="p-3">
                          {sale.quantity}
                        </td>

                        <td className="p-3">
                          {money(
                            amounts.total
                          )}
                        </td>

                        <td className="p-3">
                          {money(
                            amounts.paid
                          )}
                        </td>

                        <td className="p-3 font-semibold">
                          {money(
                            amounts.balance
                          )}
                        </td>

                        <td className="p-3">
                          <StatusBadge
                            status={getStatus(
                              sale
                            )}
                          />
                        </td>

                        <td className="p-3">
                          {new Date(
                            sale.created_at
                          ).toLocaleDateString()}
                        </td>

                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() =>
                              openPayment(
                                sale
                              )
                            }
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                          >
                            Record Payment
                          </button>
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAYMENT MODAL */}

      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  Record Payment
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Record a customer payment
                  against this sale.
                </p>
              </div>

              <button
                type="button"
                onClick={closePayment}
                disabled={saving}
                className="rounded-md px-2 py-1 text-xl text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <div className="mb-6 space-y-3 rounded-lg bg-gray-50 p-4">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Customer
                </span>

                <span className="font-medium">
                  {selectedSale.customer_name?.trim() ||
                    "N/A"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">
                  Product
                </span>

                <span className="font-medium">
                  {selectedSale.product_name}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">
                  Total
                </span>

                <span className="font-medium">
                  {money(
                    effectiveAmounts(
                      selectedSale
                    ).total
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">
                  Already Paid
                </span>

                <span className="font-medium">
                  {money(
                    effectiveAmounts(
                      selectedSale
                    ).paid
                  )}
                </span>
              </div>

              <div className="flex justify-between border-t pt-3">
                <span className="font-semibold">
                  Balance
                </span>

                <span className="font-bold text-red-600">
                  {money(
                    effectiveAmounts(
                      selectedSale
                    ).balance
                  )}
                </span>
              </div>
            </div>

            <form
              onSubmit={submitPayment}
              className="space-y-4"
            >
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Payment Amount
                </label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={payment.amount}
                  onChange={(event) =>
                    setPayment({
                      ...payment,
                      amount:
                        event.target.value,
                    })
                  }
                  placeholder="Enter amount"
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Payment Method
                </label>

                <select
                  value={
                    payment.paymentMethod
                  }
                  onChange={(event) =>
                    setPayment({
                      ...payment,
                      paymentMethod:
                        event.target
                          .value as PaymentMethod,
                    })
                  }
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
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

                  <option value="Credit">
                    Credit
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Reference
                </label>

                <input
                  type="text"
                  value={payment.reference}
                  onChange={(event) =>
                    setPayment({
                      ...payment,
                      reference:
                        event.target.value,
                    })
                  }
                  placeholder="Optional payment reference"
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Notes
                </label>

                <textarea
                  value={payment.notes}
                  onChange={(event) =>
                    setPayment({
                      ...payment,
                      notes:
                        event.target.value,
                    })
                  }
                  placeholder="Optional notes"
                  rows={3}
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closePayment}
                  disabled={saving}
                  className="rounded-lg border px-4 py-2 font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Recording..."
                    : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const classes =
    status === "Partially Paid"
      ? "bg-yellow-100 text-yellow-800"
      : "bg-red-100 text-red-800";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}
    >
      {status}
    </span>
  );
}
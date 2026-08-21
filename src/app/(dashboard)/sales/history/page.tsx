"use client";

import { useEffect, useState } from "react";

import {
  getSales,
  recordSalePayment,
} from "@/services/sales";

import type { Sale } from "@/types/sale";

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [totalSales, setTotalSales] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [paymentSale, setPaymentSale] =
    useState<Sale | null>(null);

  const [paymentAmount, setPaymentAmount] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("Cash");

  const [paymentReference, setPaymentReference] =
    useState("");

  const [paymentNotes, setPaymentNotes] =
    useState("");

  const [savingPayment, setSavingPayment] =
    useState(false);

  useEffect(() => {
    loadSales();
  }, []);

  async function loadSales() {
    setLoading(true);
    setError(null);

    const {
      data,
      error: salesError,
    } = await getSales();

    if (salesError) {
      console.error(
        "Sales loading error:",
        salesError
      );

      setError(salesError.message);
      setLoading(false);
      return;
    }

    const salesData = data || [];

    setSales(salesData);

    const total = salesData.reduce(
      (sum, sale) =>
        sum + Number(sale.total_amount || 0),
      0
    );

    setTotalSales(total);

    setLoading(false);
  }

  function formatMoney(value: number) {
    return Number(value || 0).toLocaleString(
      "en-GH",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
  }

  function getPaidAmount(sale: Sale) {
    return Number(sale.amount_paid || 0);
  }

  function getBalanceDue(sale: Sale) {
    return Number(sale.balance_due || 0);
  }

  function getTotalAmount(sale: Sale) {
    return Number(sale.total_amount || 0);
  }

  function getStatus(sale: Sale) {
    const total = getTotalAmount(sale);
    const paid = getPaidAmount(sale);
    const balance = getBalanceDue(sale);

    if (total > 0 && paid >= total) {
      return "Paid";
    }

    if (paid > 0 && balance > 0) {
      return "Partially Paid";
    }

    if (balance > 0) {
      return "Unpaid";
    }

    /*
     * Older historical records may have:
     *
     * amount_paid = 0
     * balance_due = 0
     *
     * Those records were created before the
     * current payment-tracking workflow.
     */
    return "Historical";
  }

  function statusBadge(status: string) {
    switch (status) {
      case "Paid":
        return (
          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            Paid
          </span>
        );

      case "Partially Paid":
        return (
          <span className="inline-flex rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
            Partially Paid
          </span>
        );

      case "Unpaid":
        return (
          <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
            Unpaid
          </span>
        );

      default:
        return (
          <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
            Historical
          </span>
        );
    }
  }

  function openPaymentModal(sale: Sale) {
    const balance = getBalanceDue(sale);

    if (balance <= 0) {
      return;
    }

    setPaymentSale(sale);

    setPaymentAmount(
      balance.toFixed(2)
    );

    setPaymentMethod("Cash");
    setPaymentReference("");
    setPaymentNotes("");

    setError(null);
    setSuccess(null);
  }

  function closePaymentModal() {
    if (savingPayment) {
      return;
    }

    setPaymentSale(null);
    setPaymentAmount("");
    setPaymentMethod("Cash");
    setPaymentReference("");
    setPaymentNotes("");
  }

  async function handlePayment() {
    if (!paymentSale) {
      return;
    }

    const amount = Number(paymentAmount);
    const balance = getBalanceDue(paymentSale);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError(
        "Payment amount must be greater than zero."
      );
      return;
    }

    if (balance <= 0) {
      setError(
        "This sale has no outstanding balance."
      );
      return;
    }

    if (amount > balance) {
      setError(
        `Payment cannot exceed the outstanding balance of GH₵${formatMoney(
          balance
        )}.`
      );
      return;
    }

    if (!paymentMethod.trim()) {
      setError("Payment method is required.");
      return;
    }

    setSavingPayment(true);
    setError(null);
    setSuccess(null);

    const {
      data,
      error: paymentError,
    } = await recordSalePayment(
      paymentSale.id,
      amount,
      paymentMethod,
      paymentReference,
      paymentNotes
    );

    if (paymentError || !data) {
      console.error(
        "Payment error:",
        paymentError
      );

      setError(
        paymentError?.message ||
          "Unable to record payment."
      );

      setSavingPayment(false);
      return;
    }

    const total = Number(
      data.total_amount || 0
    );

    const paid = Number(
      data.amount_paid || 0
    );

    const balanceDue = Number(
      data.balance_due || 0
    );

    const status =
      balanceDue <= 0
        ? "Paid"
        : paid > 0
        ? "Partially Paid"
        : "Unpaid";

    setSuccess(
      `Payment recorded successfully.\n\n` +
        `Total: GH₵${formatMoney(total)}\n` +
        `Paid: GH₵${formatMoney(paid)}\n` +
        `Balance: GH₵${formatMoney(
          balanceDue
        )}\n` +
        `Status: ${status}`
    );

    setPaymentSale(null);
    setPaymentAmount("");
    setPaymentMethod("Cash");
    setPaymentReference("");
    setPaymentNotes("");

    setSavingPayment(false);

    await loadSales();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Sales History
        </h1>

        <p className="mt-1 text-gray-600">
          View sales and collect outstanding
          customer payments.
        </p>
      </div>

      {error && (
        <div className="whitespace-pre-line rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="whitespace-pre-line rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          {success}
        </div>
      )}

      <div className="rounded-lg bg-indigo-600 p-6 text-white">
        <p className="text-sm">
          Total Sales
        </p>

        <h2 className="mt-1 text-3xl font-bold">
          GH₵{formatMoney(totalSales)}
        </h2>
      </div>

      {loading ? (
        <div className="rounded-lg border bg-white p-6">
          Loading sales...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-100">
              <tr className="border-b">
                <th className="whitespace-nowrap p-3 text-left">
                  Customer
                </th>

                <th className="whitespace-nowrap p-3 text-left">
                  Product
                </th>

                <th className="whitespace-nowrap p-3 text-left">
                  Qty
                </th>

                <th className="whitespace-nowrap p-3 text-left">
                  Unit Price
                </th>

                <th className="whitespace-nowrap p-3 text-left">
                  Total
                </th>

                <th className="whitespace-nowrap p-3 text-left">
                  Paid
                </th>

                <th className="whitespace-nowrap p-3 text-left">
                  Balance
                </th>

                <th className="whitespace-nowrap p-3 text-left">
                  Status
                </th>

                <th className="whitespace-nowrap p-3 text-left">
                  Action
                </th>

                <th className="whitespace-nowrap p-3 text-left">
                  Date
                </th>
              </tr>
            </thead>

            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="p-8 text-center text-gray-500"
                  >
                    No sales found.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => {
                  const total =
                    getTotalAmount(sale);

                  const paid =
                    getPaidAmount(sale);

                  const balance =
                    getBalanceDue(sale);

                  const status =
                    getStatus(sale);

                  return (
                    <tr
                      key={sale.id}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap p-3">
                        {sale.customer_name ||
                          "N/A"}
                      </td>

                      <td className="whitespace-nowrap p-3">
                        {sale.product_name}
                      </td>

                      <td className="whitespace-nowrap p-3">
                        {sale.quantity}
                      </td>

                      <td className="whitespace-nowrap p-3">
                        GH₵
                        {formatMoney(
                          Number(
                            sale.unit_price
                          )
                        )}
                      </td>

                      <td className="whitespace-nowrap p-3 font-semibold">
                        GH₵
                        {formatMoney(total)}
                      </td>

                      <td className="whitespace-nowrap p-3 font-semibold text-green-700">
                        GH₵
                        {formatMoney(paid)}
                      </td>

                      <td className="whitespace-nowrap p-3 font-semibold text-red-600">
                        GH₵
                        {formatMoney(balance)}
                      </td>

                      <td className="whitespace-nowrap p-3">
                        {statusBadge(status)}
                      </td>

                      <td className="whitespace-nowrap p-3">
                        {balance > 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              openPaymentModal(
                                sale
                              )
                            }
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                          >
                            Record Payment
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">
                            Complete
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap p-3">
                        {sale.created_at
                          ? new Date(
                              sale.created_at
                            ).toLocaleDateString()
                          : "N/A"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {paymentSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Record Payment
                </h2>

                <p className="text-sm text-gray-500">
                  {paymentSale.customer_name ||
                    "N/A"}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closePaymentModal
                }
                disabled={savingPayment}
                className="text-2xl text-gray-500 hover:text-gray-800 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="mb-5 space-y-3 rounded-lg bg-gray-50 p-4">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Product
                </span>

                <span className="font-medium">
                  {paymentSale.product_name}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">
                  Total
                </span>

                <span className="font-medium">
                  GH₵
                  {formatMoney(
                    getTotalAmount(
                      paymentSale
                    )
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">
                  Paid
                </span>

                <span className="font-medium text-green-700">
                  GH₵
                  {formatMoney(
                    getPaidAmount(
                      paymentSale
                    )
                  )}
                </span>
              </div>

              <div className="flex justify-between border-t pt-3">
                <span className="font-semibold">
                  Balance Due
                </span>

                <span className="text-xl font-bold text-red-600">
                  GH₵
                  {formatMoney(
                    getBalanceDue(
                      paymentSale
                    )
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block font-medium">
                  Payment Amount
                </label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={getBalanceDue(
                    paymentSale
                  )}
                  value={paymentAmount}
                  onChange={(event) =>
                    setPaymentAmount(
                      event.target.value
                    )
                  }
                  disabled={savingPayment}
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">
                  Payment Method
                </label>

                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(
                      event.target.value
                    )
                  }
                  disabled={savingPayment}
                  className="w-full rounded-lg border p-3"
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
                </select>
              </div>

              <div>
                <label className="mb-2 block font-medium">
                  Reference
                  <span className="ml-1 text-sm font-normal text-gray-500">
                    (optional)
                  </span>
                </label>

                <input
                  type="text"
                  value={paymentReference}
                  onChange={(event) =>
                    setPaymentReference(
                      event.target.value
                    )
                  }
                  disabled={savingPayment}
                  placeholder="Transaction or receipt number"
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">
                  Notes
                  <span className="ml-1 text-sm font-normal text-gray-500">
                    (optional)
                  </span>
                </label>

                <textarea
                  value={paymentNotes}
                  onChange={(event) =>
                    setPaymentNotes(
                      event.target.value
                    )
                  }
                  disabled={savingPayment}
                  placeholder="Payment notes..."
                  rows={3}
                  className="w-full rounded-lg border p-3"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={
                  closePaymentModal
                }
                disabled={savingPayment}
                className="flex-1 rounded-lg border px-4 py-3 font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handlePayment}
                disabled={savingPayment}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingPayment
                  ? "Recording..."
                  : "Record Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
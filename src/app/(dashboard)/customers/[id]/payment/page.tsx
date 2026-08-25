"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface Customer {
  id: string;
  customer_name: string;
  phone: string | null;
  address: string | null;
  customer_type: string | null;
  balance: number | null;
}

function money(value: number) {
  return `GH₵${value.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CustomerPaymentPage() {
  const params = useParams();
  const router = useRouter();

  const customerId = String(params.id);

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [currentBalance, setCurrentBalance] =
    useState(0);

  const [amount, setAmount] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("Cash");

  const [notes, setNotes] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  async function loadCustomer() {
    setLoading(true);
    setError("");

    const customerResult =
      await supabase
        .from("customers")
        .select(
          `
            id,
            customer_name,
            phone,
            address,
            customer_type,
            balance
          `
        )
        .eq("id", customerId)
        .maybeSingle();

    if (customerResult.error) {
      setError(
        customerResult.error.message
      );
      setLoading(false);
      return;
    }

    if (!customerResult.data) {
      setError(
        "Customer was not found."
      );
      setLoading(false);
      return;
    }

    const customerData =
      customerResult.data as Customer;

    setCustomer(customerData);

    // Use the sales ledger as the current
    // authoritative outstanding balance.
    const salesResult =
      await supabase
        .from("sales")
        .select("balance_due")
        .eq(
          "customer_name",
          customerData.customer_name
        );

    if (salesResult.error) {
      setError(
        salesResult.error.message
      );
      setLoading(false);
      return;
    }

    const ledgerBalance =
      (salesResult.data ?? []).reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.balance_due ?? 0
          ),
        0
      );

    setCurrentBalance(
      ledgerBalance
    );

    setLoading(false);
  }

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!customer) {
      setError(
        "Customer information is not available."
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
      setError(
        "Payment amount must be greater than zero."
      );
      return;
    }

    if (
      currentBalance <= 0
    ) {
      setError(
        "This customer has no outstanding balance."
      );
      return;
    }

    if (
      paymentAmount >
      currentBalance
    ) {
      setError(
        `Payment cannot exceed the outstanding balance of ${money(
          currentBalance
        )}.`
      );
      return;
    }

    if (!paymentMethod.trim()) {
      setError(
        "Please select a payment method."
      );
      return;
    }

    setSaving(true);

    try {
      /*
       * Use the existing database RPC.
       *
       * This keeps customer balance,
       * sales.amount_paid,
       * sales.balance_due and
       * customer payment records synchronized.
       */
      const { data, error } =
        await supabase.rpc(
          "record_customer_payment",
          {
            p_customer_name:
              customer.customer_name,

            p_amount:
              paymentAmount,

            p_payment_method:
              paymentMethod.trim(),

            p_notes:
              notes.trim() || null,
          }
        );

      if (error) {
        console.error(
          "Customer payment error:",
          error
        );

        throw new Error(
          error.message
        );
      }

      console.log(
        "Customer payment recorded:",
        data
      );

      setSuccess(
        `${money(
          paymentAmount
        )} payment recorded successfully.`
      );

      setAmount("");
      setNotes("");

      // Reload the ledger after payment.
      await loadCustomer();

    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Failed to record payment."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="space-y-6 p-6">

        <Link
          href={`/customers/${customerId}`}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to Customer Account
        </Link>

        <div className="rounded-xl border bg-white p-10 text-center shadow-sm">
          Loading customer...
        </div>

      </main>
    );
  }

  if (!customer) {
    return (
      <main className="space-y-6 p-6">

        <Link
          href="/customers"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to Customers
        </Link>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
          {error || "Customer was not found."}
        </div>

      </main>
    );
  }

  return (
    <main className="max-w-2xl space-y-8 p-6">

      {/* Header */}

      <div>

        <Link
          href={`/customers/${customer.id}`}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to Customer Account
        </Link>

        <h1 className="mt-3 text-3xl font-bold">
          Record Customer Payment
        </h1>

        <p className="mt-1 text-gray-600">
          Record a payment for{" "}
          <span className="font-medium">
            {customer.customer_name}
          </span>
          .
        </p>

      </div>


      {/* Current Balance */}

      <section className="rounded-xl border bg-white p-6 shadow-sm">

        <p className="text-sm font-medium text-gray-500">
          Current Outstanding Balance
        </p>

        <p className="mt-2 text-3xl font-bold text-red-600">
          {money(currentBalance)}
        </p>

        <p className="mt-2 text-sm text-gray-500">
          Payment cannot exceed this amount.
        </p>

      </section>


      {/* Success */}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">

          <p className="font-medium">
            Payment Successful
          </p>

          <p className="mt-1 text-sm">
            {success}
          </p>

          <Link
            href={`/customers/${customer.id}`}
            className="mt-3 inline-block font-medium underline"
          >
            View Customer Account
          </Link>

        </div>
      )}


      {/* Error */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">

          <p className="font-medium">
            Payment Error
          </p>

          <p className="mt-1 text-sm">
            {error}
          </p>

        </div>
      )}


      {/* Payment Form */}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border bg-white p-6 shadow-sm"
      >

        <div>

          <label className="mb-2 block font-medium">
            Payment Amount
          </label>

          <input
            type="number"
            min="0.01"
            max={currentBalance}
            step="0.01"
            value={amount}
            onChange={(event) =>
              setAmount(
                event.target.value
              )
            }
            placeholder="Enter payment amount"
            className="w-full rounded-lg border p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            required
          />

          <p className="mt-1 text-xs text-gray-500">
            Maximum payment:{" "}
            {money(currentBalance)}
          </p>

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
            className="w-full rounded-lg border p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="Cash">
              Cash
            </option>

            <option value="Bank Transfer">
              Bank Transfer
            </option>

            <option value="Mobile Money">
              Mobile Money
            </option>

            <option value="Cheque">
              Cheque
            </option>

            <option value="Other">
              Other
            </option>
          </select>

        </div>


        <div>

          <label className="mb-2 block font-medium">
            Notes
          </label>

          <textarea
            value={notes}
            onChange={(event) =>
              setNotes(
                event.target.value
              )
            }
            rows={4}
            placeholder="Optional payment notes or reference"
            className="w-full rounded-lg border p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />

        </div>


        <button
          type="submit"
          disabled={
            saving ||
            currentBalance <= 0
          }
          className="w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "Recording Payment..."
            : "Record Payment"}
        </button>

      </form>


      {/* Accounting Information */}

      <section className="rounded-xl border bg-gray-50 p-5">

        <h2 className="font-semibold">
          Payment Processing
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          This payment is processed through the
          existing customer payment workflow. The
          database applies the payment to outstanding
          sales and records the payment separately.
        </p>

      </section>

    </main>
  );
}
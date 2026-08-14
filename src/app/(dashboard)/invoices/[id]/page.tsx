"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: string;
  created_at: string;
}

export default function InvoicePage() {
  const params = useParams();

  const invoiceNumber = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(
    null
  );

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInvoice() {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("invoice_number", invoiceNumber)
        .single();

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setInvoice(data);
      setLoading(false);
    }

    if (invoiceNumber) {
      loadInvoice();
    }
  }, [invoiceNumber]);

  if (loading) {
    return (
      <main className="p-6">
        <p>Loading invoice...</p>
      </main>
    );
  }

  if (!invoice) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold">
          Invoice not found
        </h1>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="rounded-lg border bg-white p-8 shadow">
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Print Invoice
          </button>
        </div>

        <h1 className="text-3xl font-bold">
          Rexy Blocks Factory
        </h1>

        <p className="text-gray-600">
          Esaase, Kumasi, Ghana
        </p>

        <hr className="my-6" />

        <div className="space-y-2">
          <p>
            <strong>Invoice Number:</strong>{" "}
            {invoice.invoice_number}
          </p>

          <p>
            <strong>Date:</strong>{" "}
            {new Date(
              invoice.created_at
            ).toLocaleDateString()}
          </p>

          <p>
            <strong>Customer:</strong>{" "}
            {invoice.customer_name}
          </p>
        </div>

        <hr className="my-6" />

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-left">
                Product
              </th>

              <th className="p-3 text-left">
                Quantity
              </th>

              <th className="p-3 text-left">
                Unit Price
              </th>

              <th className="p-3 text-left">
                Total
              </th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td className="p-3">
                {invoice.product_name}
              </td>

              <td className="p-3">
                {invoice.quantity}
              </td>

              <td className="p-3">
                GH₵
                {Number(
                  invoice.unit_price
                ).toLocaleString()}
              </td>

              <td className="p-3">
                GH₵
                {Number(
                  invoice.total_amount
                ).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>

        <hr className="my-6" />

        <p>
          <strong>Payment Method:</strong>{" "}
          {invoice.payment_method}
        </p>

        <div className="mt-8 text-sm text-gray-500">
          Thank you for choosing Rexy Blocks
          Factory.
        </div>
      </div>
    </main>
  );
}
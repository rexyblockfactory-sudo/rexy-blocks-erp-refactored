"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_status: string;
  created_at: string;
}

export default function InvoiceHistoryPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  console.log("Invoices:", data);
  console.log("Error:", error);

  if (error) {
    console.error(error);
    return;
  }

  setInvoices(data || []);
}

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        Invoice History
      </h1>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">
                Invoice
              </th>

              <th className="p-3 text-left">
                Customer
              </th>

              <th className="p-3 text-left">
                Product
              </th>

              <th className="p-3 text-left">
                Quantity
              </th>

              <th className="p-3 text-left">
                Total
              </th>

              <th className="p-3 text-left">
                Status
              </th>

              <th className="p-3 text-left">
                Date
              </th>
            </tr>
          </thead>

          <tbody>
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                className="border-b"
              >
                <td className="p-3">
                  {invoice.invoice_number}
                </td>

                <td className="p-3">
                  {invoice.customer_name}
                </td>

                <td className="p-3">
                  {invoice.product_name}
                </td>

                <td className="p-3">
                  {invoice.quantity}
                </td>

                <td className="p-3">
                  GH₵{invoice.total_amount}
                </td>

                <td className="p-3">
                  {invoice.payment_status}
                </td>

                <td className="p-3">
                  {new Date(
                    invoice.created_at
                  ).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
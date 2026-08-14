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
  payment_method: string;
  created_at: string;
}

export default function InvoicesPage() {
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

    if (error) {
      console.error(error);
      return;
    }

    setInvoices(data || []);
  }

  return (
    <main className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">
        Invoice Management
      </h1>

      <div className="rounded-lg bg-white p-6 shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left">
                  Invoice No.
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
                  Amount
                </th>

                <th className="p-3 text-left">
                  Payment Method
                </th>
              </tr>
            </thead>

            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-4 text-center"
                  >
                    No invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
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
                      GH₵
                      {invoice.total_amount.toLocaleString()}
                    </td>

                    <td className="p-3">
                      {invoice.payment_method}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
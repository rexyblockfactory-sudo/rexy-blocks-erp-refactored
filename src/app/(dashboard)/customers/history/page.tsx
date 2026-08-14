"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface Customer {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  customer_type: string;
  balance: number;
  created_at: string;
}

export default function CustomerHistoryPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      return;
    }

    setCustomers(data || []);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        Customer History
      </h1>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">
                Customer
              </th>

              <th className="p-3 text-left">
                Phone
              </th>

              <th className="p-3 text-left">
                Address
              </th>

              <th className="p-3 text-left">
                Type
              </th>

              <th className="p-3 text-left">
                Balance
              </th>

              <th className="p-3 text-left">
                Date
              </th>
            </tr>
          </thead>

          <tbody>
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className="border-b"
              >
                <td className="p-3">
                  {customer.customer_name}
                </td>

                <td className="p-3">
                  {customer.phone}
                </td>

                <td className="p-3">
                  {customer.address}
                </td>

                <td className="p-3">
                  {customer.customer_type}
                </td>

                <td className="p-3">
                  GH₵{customer.balance}
                </td>

                <td className="p-3">
                  {new Date(
                    customer.created_at
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
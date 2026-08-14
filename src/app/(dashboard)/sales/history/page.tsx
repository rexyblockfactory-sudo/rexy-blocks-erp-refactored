"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface Sale {
  id: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: string;
  created_at: string;
}

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [totalSales, setTotalSales] = useState(0);

  useEffect(() => {
    loadSales();
  }, []);

  async function loadSales() {
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      return;
    }

    const salesData = data || [];

    setSales(salesData);

    const total = salesData.reduce(
      (sum, item) => sum + Number(item.total_amount),
      0
    );

    setTotalSales(total);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        Sales History
      </h1>

      <div className="rounded-lg bg-indigo-600 p-6 text-white">
        <p>Total Sales</p>

        <h2 className="text-3xl font-bold">
          GH₵{totalSales.toLocaleString()}
        </h2>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-100">
            <tr className="border-b">
              <th className="w-48 p-3 text-left">
                Customer
              </th>

              <th className="w-56 p-3 text-left">
                Product
              </th>

              <th className="w-24 p-3 text-left">
                Quantity
              </th>

              <th className="w-32 p-3 text-left">
                Unit Price
              </th>

              <th className="w-32 p-3 text-left">
                Total
              </th>

              <th className="w-40 p-3 text-left">
                Payment
              </th>

              <th className="w-32 p-3 text-left">
                Date
              </th>
            </tr>
          </thead>

          <tbody>
            {sales.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-6 text-center text-gray-500"
                >
                  No sales found.
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr
                  key={sale.id}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="p-3">
                    {sale.customer_name || "N/A"}
                  </td>

                  <td className="p-3">
                    {sale.product_name}
                  </td>

                  <td className="p-3">
                    {sale.quantity}
                  </td>

                  <td className="p-3">
                    GH₵
                    {Number(
                      sale.unit_price
                    ).toLocaleString()}
                  </td>

                  <td className="p-3 font-semibold">
                    GH₵
                    {Number(
                      sale.total_amount
                    ).toLocaleString()}
                  </td>

                  <td className="p-3">
                    {sale.payment_method}
                  </td>

                  <td className="p-3">
                    {sale.created_at
                      ? new Date(
                          sale.created_at
                        ).toLocaleDateString()
                      : "N/A"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
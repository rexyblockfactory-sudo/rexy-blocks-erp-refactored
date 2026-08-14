"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function ReportsPage() {
  const [salesTotal, setSalesTotal] = useState(0);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [productionTotal, setProductionTotal] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const sales = await supabase
      .from("sales")
      .select("total_amount");

    const expenses = await supabase
      .from("expenses")
      .select("amount");

    const inventory = await supabase
      .from("inventory")
      .select("quantity, unit_cost");

    const invoices = await supabase
      .from("invoices")
      .select("total_amount");

    const production = await supabase
      .from("production")
      .select("quantity");

    setSalesTotal(
      (sales.data || []).reduce(
        (sum, item) => sum + Number(item.total_amount),
        0
      )
    );

    setExpensesTotal(
      (expenses.data || []).reduce(
        (sum, item) => sum + Number(item.amount),
        0
      )
    );

    setInventoryTotal(
      (inventory.data || []).reduce(
        (sum, item) =>
          sum +
          Number(item.quantity) *
            Number(item.unit_cost),
        0
      )
    );

    setInvoiceTotal(
      (invoices.data || []).reduce(
        (sum, item) => sum + Number(item.total_amount),
        0
      )
    );

    setProductionTotal(
      (production.data || []).reduce(
        (sum, item) => sum + Number(item.quantity),
        0
      )
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        Reports
      </h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

        <div className="rounded-lg border p-6">
          <h2 className="font-semibold">
            Total Sales
          </h2>

          <p className="mt-2 text-3xl font-bold">
            GH₵{salesTotal.toLocaleString()}
          </p>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="font-semibold">
            Total Expenses
          </h2>

          <p className="mt-2 text-3xl font-bold">
            GH₵{expensesTotal.toLocaleString()}
          </p>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="font-semibold">
            Inventory Value
          </h2>

          <p className="mt-2 text-3xl font-bold">
            GH₵{inventoryTotal.toLocaleString()}
          </p>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="font-semibold">
            Invoice Value
          </h2>

          <p className="mt-2 text-3xl font-bold">
            GH₵{invoiceTotal.toLocaleString()}
          </p>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="font-semibold">
            Blocks Produced
          </h2>

          <p className="mt-2 text-3xl font-bold">
            {productionTotal.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
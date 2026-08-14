"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function DashboardPage() {
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalInventoryValue, setTotalInventoryValue] = useState(0);
  const [totalBlocks, setTotalBlocks] = useState(0);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    // Expenses
    const { data: expenses } = await supabase
      .from("expenses")
      .select("amount");

    const expenseTotal = (expenses || []).reduce(
      (sum, item) => sum + Number(item.amount),
      0
    );

    setTotalExpenses(expenseTotal);

    // Inventory
    const { data: inventory } = await supabase
      .from("inventory")
      .select("quantity, unit_cost");

    const inventoryTotal = (inventory || []).reduce(
      (sum, item) =>
        sum +
        Number(item.quantity) *
          Number(item.unit_cost),
      0
    );

    setTotalInventoryValue(inventoryTotal);

    // Production
    const { data: production } = await supabase
      .from("production")
      .select("quantity");

    const productionTotal = (production || []).reduce(
      (sum, item) => sum + Number(item.quantity),
      0
    );

    setTotalBlocks(productionTotal);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        Rexy Blocks Dashboard
      </h1>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg bg-blue-600 p-6 text-white">
          <p>Total Expenses</p>

          <h2 className="text-3xl font-bold">
            GH₵{totalExpenses.toLocaleString()}
          </h2>
        </div>

        <div className="rounded-lg bg-green-600 p-6 text-white">
          <p>Total Inventory Value</p>

          <h2 className="text-3xl font-bold">
            GH₵
            {totalInventoryValue.toLocaleString()}
          </h2>
        </div>

        <div className="rounded-lg bg-purple-600 p-6 text-white">
          <p>Total Blocks Produced</p>

          <h2 className="text-3xl font-bold">
            {totalBlocks.toLocaleString()}
          </h2>
        </div>
      </div>
    </div>
  );
}
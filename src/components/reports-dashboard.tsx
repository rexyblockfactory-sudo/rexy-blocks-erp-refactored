"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function ReportsDashboard() {
  const [salesCount, setSalesCount] = useState(0);
  const [productionCount, setProductionCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { count: sales } = await supabase
      .from("sales")
      .select("*", { count: "exact", head: true });

    const { count: production } = await supabase
      .from("production")
      .select("*", { count: "exact", head: true });

    const { count: customers } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true });

    const { count: inventory } = await supabase
      .from("inventory")
      .select("*", { count: "exact", head: true });

    setSalesCount(sales || 0);
    setProductionCount(production || 0);
    setCustomerCount(customers || 0);
    setInventoryCount(inventory || 0);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border p-6 shadow">
        <h2 className="text-lg font-bold">Sales</h2>
        <p className="mt-2 text-3xl">{salesCount}</p>
      </div>

      <div className="rounded-lg border p-6 shadow">
        <h2 className="text-lg font-bold">Production</h2>
        <p className="mt-2 text-3xl">{productionCount}</p>
      </div>

      <div className="rounded-lg border p-6 shadow">
        <h2 className="text-lg font-bold">Customers</h2>
        <p className="mt-2 text-3xl">{customerCount}</p>
      </div>

      <div className="rounded-lg border p-6 shadow">
        <h2 className="text-lg font-bold">Inventory</h2>
        <p className="mt-2 text-3xl">{inventoryCount}</p>
      </div>
    </div>
  );
}
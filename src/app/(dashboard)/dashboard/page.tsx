"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import DashboardStats from "@/components/dashboard/DashboardStats";
import LowStock from "@/components/dashboard/LowStock";
import RecentSales from "@/components/dashboard/RecentSales";
import ProductionHistory from "@/components/dashboard/ProductionHistory";
import type {
  DashboardLowStockItem,
  DashboardProductionRecord,
  DashboardRecentSale,
} from "@/types/dashboard";

export default function DashboardPage() {
  const [salesTotal, setSalesTotal] = useState(0);
  const [productionTotal, setProductionTotal] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<DashboardLowStockItem[]>([]);
  const [recentSales, setRecentSales] = useState<DashboardRecentSale[]>([]);
  const [recentProduction, setRecentProduction] = useState<DashboardProductionRecord[]>([]);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data: sales, error: salesError } = await supabase
          .from("sales")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);

        const { data: production, error: productionError } = await supabase
          .from("production")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);

        const { data: inventory, error: inventoryError } = await supabase
          .from("inventory")
          .select("*");

        const { data: alerts, error: alertsError } = await supabase
          .from("stock_alerts")
          .select("*");

        if (salesError) console.error("Dashboard sales error:", salesError);
        if (productionError) console.error("Dashboard production error:", productionError);
        if (inventoryError) console.error("Dashboard inventory error:", inventoryError);
        if (alertsError) console.error("Dashboard stock alerts error:", alertsError);

        const totalSales =
          sales?.reduce((sum, item) => sum + Number(item.total_amount), 0) ?? 0;

        const totalProduction =
          production?.reduce((sum, item) => sum + Number(item.quantity), 0) ?? 0;

        const alertItems: DashboardLowStockItem[] = [];

        alerts?.forEach((alert) => {
          const item = inventory?.find(
            (inventoryItem) => inventoryItem.item_name === alert.item_name
          );

          if (
            item &&
            Number(item.quantity) < Number(alert.minimum_quantity)
          ) {
            alertItems.push({
              name: item.item_name,
              quantity: Number(item.quantity),
            });
          }
        });

        setSalesTotal(totalSales);
        setProductionTotal(totalProduction);
        setProductCount(inventory?.length ?? 0);
        setLowStockCount(alertItems.length);
        setLowStockItems(alertItems);
        setRecentSales((sales ?? []) as DashboardRecentSale[]);
        setRecentProduction((production ?? []) as DashboardProductionRecord[]);
      } catch (error) {
        console.error("Dashboard error:", error);
      }
    }

    loadDashboard();
  }, []);

  return (
    <main className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Rexy Blocks ERP Dashboard</h1>

      <DashboardStats
        salesTotal={salesTotal}
        productionTotal={productionTotal}
        productCount={productCount}
        lowStockCount={lowStockCount}
      />

      <LowStock items={lowStockItems} />
      <RecentSales sales={recentSales} />
      <ProductionHistory records={recentProduction} />
    </main>
  );
}

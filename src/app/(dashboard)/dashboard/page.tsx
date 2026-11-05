"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

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

interface Sale {
  id: string;
  customer_name: string | null;
  product_name?: string | null;
  quantity?: number | null;
  total_amount: number | null;
  amount_paid: number | null;
  balance_due: number | null;
  cost_per_unit?: number | null;
  cogs?: number | null;
  gross_profit?: number | null;
  gross_margin?: number | null;
  created_at: string;
}

interface Payment {
  id: string;
  sale_id: string;
  amount: number | null;
  created_at: string;
}

interface Expense {
  id: string;
  expense_name: string;
  category: string;
  amount: number | null;
  notes: string | null;
  created_at: string;
}

interface ExpenseCategory {
  category: string;
  amount: number;
}

interface InventoryItem {
  id: string;
  item_name: string;
  category: string;
  unit: string;
  quantity: number | null;
  unit_cost: number | null;
  created_at: string;
}

interface StockAlert {
  id?: string;
  item_name: string;
  minimum_quantity: number | null;
}

interface FinishedGoodsInventory {
  id: string;
  product_name: string;
  quantity: number | null;
  unit_cost: number | null;
  total_cost: number | null;
  costed_quantity: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface MonthlyProductionRecord {
  id: string;
  quantity: number | null;
  created_at: string;
}

interface MonthlyChartData {
  key: string;
  month: string;
  sales: number;
  production: number;
  profit: number;
  credit: number;
}

function money(value: number): string {
  const amount =
    Number(value || 0);

  return `GH₵${amount.toLocaleString(
    "en-GH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function number(
  value: number,
  decimals = 0
): string {
  const amount =
    Number(value || 0);

  return amount.toLocaleString(
    "en-GH",
    {
      minimumFractionDigits:
        decimals,
      maximumFractionDigits:
        decimals,
    }
  );
}

function percent(
  value: number
): string {
  const amount =
    Number(value || 0);

  return `${amount.toFixed(
    2
  )}%`;
}

function getMonthKey(
  value: string | Date
): string {
  const date =
    new Date(value);

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

export default function DashboardPage() {
  /* ========================================
     OPERATIONAL STATE
  ======================================== */

  const [
    salesTotal,
    setSalesTotal,
  ] = useState(0);

  const [
    productionTotal,
    setProductionTotal,
  ] = useState(0);

  const [
    productCount,
    setProductCount,
  ] = useState(0);

  const [
    lowStockCount,
    setLowStockCount,
  ] = useState(0);

  const [
    lowStockItems,
    setLowStockItems,
  ] = useState<
    DashboardLowStockItem[]
  >([]);

  const [
    recentSales,
    setRecentSales,
  ] = useState<
    DashboardRecentSale[]
  >([]);

  const [
    recentProduction,
    setRecentProduction,
  ] = useState<
    DashboardProductionRecord[]
  >([]);

  /* ========================================
     MONTHLY CHART DATA
  ======================================== */

  const [
    monthlySales,
    setMonthlySales,
  ] = useState<Sale[]>([]);

  const [
    monthlyProduction,
    setMonthlyProduction,
  ] = useState<
    MonthlyProductionRecord[]
  >([]);

  /* ========================================
     RECEIVABLES
  ======================================== */

  const [
    totalCollected,
    setTotalCollected,
  ] = useState(0);

  const [
    outstandingReceivables,
    setOutstandingReceivables,
  ] = useState(0);

  const [
    customersOwing,
    setCustomersOwing,
  ] = useState(0);

  const [
    currentReceivables,
    setCurrentReceivables,
  ] = useState(0);

  const [
    days31to60,
    setDays31to60,
  ] = useState(0);

  const [
    days61to90,
    setDays61to90,
  ] = useState(0);

  const [
    days90Plus,
    setDays90Plus,
  ] = useState(0);

  /* ========================================
     FINANCIAL STATE
  ======================================== */

  const [
    totalCogs,
    setTotalCogs,
  ] = useState(0);

  const [
    grossProfit,
    setGrossProfit,
  ] = useState(0);

  const [
    grossMargin,
    setGrossMargin,
  ] = useState(0);

  const [
    totalExpenses,
    setTotalExpenses,
  ] = useState(0);

  const [
    netCashFlow,
    setNetCashFlow,
  ] = useState(0);

  const [
    netProfit,
    setNetProfit,
  ] = useState(0);

  const [
    expenseCount,
    setExpenseCount,
  ] = useState(0);

  const [
    expenseCategories,
    setExpenseCategories,
  ] = useState<
    ExpenseCategory[]
  >([]);

  /* ========================================
     INVENTORY VALUE
  ======================================== */

  const [
    rawMaterialValue,
    setRawMaterialValue,
  ] = useState(0);

  const [
    finishedGoodsValue,
    setFinishedGoodsValue,
  ] = useState(0);

  const [
    rawMaterialItems,
    setRawMaterialItems,
  ] = useState(0);

  const [
    finishedGoodsItems,
    setFinishedGoodsItems,
  ] = useState(0);

  const [
    uncostedFinishedGoods,
    setUncostedFinishedGoods,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  /* ========================================
     LOAD DASHBOARD
  ======================================== */

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);

        const now =
          new Date();

        const twelveMonthsAgo =
          new Date(
            now.getFullYear(),
            now.getMonth() - 11,
            1
          );

        /* ------------------------------------
           RECENT SALES - LATEST 5
        ------------------------------------ */

        const {
          data: recentSalesData,
          error: recentSalesError,
        } = await supabase
          .from("sales")
          .select("*")
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(5);

        /* ------------------------------------
           RECENT PRODUCTION - LATEST 5

           Used only by ProductionHistory.
        ------------------------------------ */

        const {
          data: recentProductionData,
          error: recentProductionError,
        } = await supabase
          .from("production")
          .select("*")
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(5);

        /* ------------------------------------
           MONTHLY PRODUCTION - 12 MONTHS

           Separate query for charts.
        ------------------------------------ */

        const {
          data: monthlyProductionData,
          error: monthlyProductionError,
        } = await supabase
          .from("production")
          .select(`
            id,
            quantity,
            created_at
          `)
          .gte(
            "created_at",
            twelveMonthsAgo.toISOString()
          )
          .order(
            "created_at",
            {
              ascending: true,
            }
          );

        /* ------------------------------------
           INVENTORY
        ------------------------------------ */

        const {
          data: inventory,
          error: inventoryError,
        } = await supabase
          .from("inventory")
          .select("*");

        /* ------------------------------------
           FINISHED GOODS INVENTORY
        ------------------------------------ */

        const {
          data: finishedGoodsData,
          error: finishedGoodsError,
        } = await supabase
          .from("finished_goods_inventory")
          .select(`
            id,
            product_name,
            quantity,
            unit_cost,
            total_cost,
            costed_quantity,
            created_at,
            updated_at
          `);

        /* ------------------------------------
           STOCK ALERTS
        ------------------------------------ */

        const {
          data: alerts,
          error: alertsError,
        } = await supabase
          .from("stock_alerts")
          .select("*");

        /* ------------------------------------
           ALL SALES

           Used for financial totals.
        ------------------------------------ */

        const {
          data: allSales,
          error: allSalesError,
        } = await supabase
          .from("sales")
          .select(`
            id,
            customer_name,
            product_name,
            quantity,
            total_amount,
            amount_paid,
            balance_due,
            cost_per_unit,
            cogs,
            gross_profit,
            gross_margin,
            created_at
          `);

        /* ------------------------------------
           MONTHLY SALES - 12 MONTHS
        ------------------------------------ */

        const {
          data: monthlySalesData,
          error: monthlySalesError,
        } = await supabase
          .from("sales")
          .select(`
            id,
            customer_name,
            product_name,
            quantity,
            total_amount,
            amount_paid,
            balance_due,
            cost_per_unit,
            cogs,
            gross_profit,
            gross_margin,
            created_at
          `)
          .gte(
            "created_at",
            twelveMonthsAgo.toISOString()
          )
          .order(
            "created_at",
            {
              ascending: true,
            }
          );

        /* ------------------------------------
           EXPENSES
        ------------------------------------ */

        const {
          data: expenses,
          error: expensesError,
        } = await supabase
          .from("expenses")
          .select(`
            id,
            expense_name,
            category,
            amount,
            notes,
            created_at
          `)
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        /* ------------------------------------
           ERROR LOGGING
        ------------------------------------ */

        if (recentSalesError) {
          console.error(
            "Dashboard recent sales error:",
            recentSalesError
          );
        }

        if (
          recentProductionError
        ) {
          console.error(
            "Dashboard recent production error:",
            recentProductionError
          );
        }

        if (
          monthlyProductionError
        ) {
          console.error(
            "Dashboard monthly production error:",
            monthlyProductionError
          );
        }

        if (inventoryError) {
          console.error(
            "Dashboard inventory error:",
            inventoryError
          );
        }

        if (finishedGoodsError) {
          console.error(
            "Dashboard finished goods error:",
            finishedGoodsError
          );
        }

        if (alertsError) {
          console.error(
            "Dashboard alerts error:",
            alertsError
          );
        }

        if (allSalesError) {
          console.error(
            "Dashboard all sales error:",
            allSalesError
          );
        }

        if (monthlySalesError) {
          console.error(
            "Dashboard monthly sales error:",
            monthlySalesError
          );
        }

        if (expensesError) {
          console.error(
            "Dashboard expenses error:",
            expensesError
          );
        }

        /* ------------------------------------
           NORMALIZE DATA
        ------------------------------------ */

        // Prefer the full sales query for financial totals.
        // Fall back to the recent-sales query if the full query
        // returns no rows while recent sales are available.
        const saleRows =
          (
            (allSales && allSales.length > 0)
              ? allSales
              : (recentSalesData || [])
          ) as Sale[];

        const monthlySaleRows =
          (
            monthlySalesData || []
          ) as Sale[];

        const inventoryRows =
          (
            inventory || []
          ) as InventoryItem[];

        const finishedGoodsRows =
          (
            finishedGoodsData || []
          ) as FinishedGoodsInventory[];

        const alertRows =
          (
            alerts || []
          ) as StockAlert[];

        const expenseRows =
          (
            expenses || []
          ) as Expense[];

        /* ------------------------------------
           TOTAL SALES
        ------------------------------------ */

        const totalSales =
          saleRows.reduce(
            (
              sum,
              sale
            ) =>
              sum +
              Number(
                sale.total_amount || 0
              ),
            0
          );

        /* ------------------------------------
           COGS
        ------------------------------------ */

        const calculatedCogs =
          saleRows.reduce(
            (
              sum,
              sale
            ) =>
              sum +
              Math.max(
                0,
                Number(
                  sale.cogs || 0
                )
              ),
            0
          );

        /* ------------------------------------
           GROSS PROFIT
        ------------------------------------ */

        const calculatedGrossProfit =
          totalSales -
          calculatedCogs;

        const calculatedGrossMargin =
          totalSales > 0
            ? (
                calculatedGrossProfit /
                totalSales
              ) *
              100
            : 0;

        /* ------------------------------------
           AVAILABLE FINISHED BLOCKS

           Current physical stock comes from
           finished_goods_inventory. Historical
           production remains separate for the
           monthly chart and ProductionHistory.
        ------------------------------------ */

        const totalProduction =
          finishedGoodsRows.reduce(
            (sum, item) =>
              sum +
              Number(item.quantity || 0),
            0
          );

        /* ------------------------------------
           LOW STOCK
        ------------------------------------ */

        const alertItems:
          DashboardLowStockItem[] =
          [];

        alertRows.forEach(
          (alert) => {
            const item =
              inventoryRows.find(
                (
                  inventoryItem
                ) =>
                  inventoryItem.item_name ===
                  alert.item_name
              );

            if (
              item &&
              Number(
                item.quantity || 0
              ) <
                Number(
                  alert.minimum_quantity ||
                    0
                )
            ) {
              alertItems.push({
                name:
                  item.item_name,
                quantity:
                  Number(
                    item.quantity || 0
                  ),
              });
            }
          }
        );

        /* ------------------------------------
           PAYMENTS
        ------------------------------------ */

        const saleIds =
          saleRows.map(
            (sale) =>
              sale.id
          );

        let paymentRows:
          Payment[] = [];

        if (
          saleIds.length > 0
        ) {
          const {
            data: payments,
            error: paymentsError,
          } = await supabase
            .from("sale_payments")
            .select(`
              id,
              sale_id,
              amount,
              created_at
            `)
            .in(
              "sale_id",
              saleIds
            );

          if (paymentsError) {
            console.error(
              "Dashboard payments error:",
              paymentsError
            );
          } else {
            paymentRows =
              (
                payments || []
              ) as Payment[];
          }
        }

        /* ------------------------------------
           PAYMENTS BY SALE
        ------------------------------------ */

        const paymentsBySale =
          new Map<
            string,
            number
          >();

        paymentRows.forEach(
          (payment) => {
            const existing =
              paymentsBySale.get(
                payment.sale_id
              ) || 0;

            paymentsBySale.set(
              payment.sale_id,
              existing +
                Number(
                  payment.amount || 0
                )
            );
          }
        );

        /* ------------------------------------
           RECEIVABLES
        ------------------------------------ */

        let collected = 0;
        let outstanding = 0;
        let current = 0;
        let thirtyOneToSixty = 0;
        let sixtyOneToNinety = 0;
        let ninetyPlus = 0;

        const owingCustomers =
          new Set<string>();

        saleRows.forEach(
          (sale) => {
            const total =
              Number(
                sale.total_amount || 0
              );

            const paid =
              paymentsBySale.has(
                sale.id
              )
                ? paymentsBySale.get(
                    sale.id
                  ) || 0
                : Number(
                    sale.amount_paid || 0
                  );

            const balance =
              Math.max(
                0,
                total - paid
              );

            collected += paid;

            if (
              balance <= 0
            ) {
              return;
            }

            outstanding +=
              balance;

            const customer =
              sale.customer_name?.trim();

            if (customer) {
              owingCustomers.add(
                customer
              );
            }

            const saleDate =
              new Date(
                sale.created_at
              );

            const ageMs =
              now.getTime() -
              saleDate.getTime();

            const days =
              Math.max(
                0,
                Math.floor(
                  ageMs /
                    (
                      1000 *
                      60 *
                      60 *
                      24
                    )
                )
              );

            if (
              days <= 30
            ) {
              current +=
                balance;
            } else if (
              days <= 60
            ) {
              thirtyOneToSixty +=
                balance;
            } else if (
              days <= 90
            ) {
              sixtyOneToNinety +=
                balance;
            } else {
              ninetyPlus +=
                balance;
            }
          }
        );

        /* ------------------------------------
           EXPENSES
        ------------------------------------ */

        const expenseTotal =
          expenseRows.reduce(
            (
              sum,
              expense
            ) =>
              sum +
              Number(
                expense.amount || 0
              ),
            0
          );

        const categories =
          new Map<
            string,
            number
          >();

        expenseRows.forEach(
          (expense) => {
            const category =
              expense.category?.trim() ||
              "Uncategorized";

            categories.set(
              category,
              (
                categories.get(
                  category
                ) || 0
              ) +
                Number(
                  expense.amount || 0
                )
            );
          }
        );

        const categorySummary =
          Array.from(
            categories.entries()
          )
            .map(
              ([
                category,
                amount,
              ]) => ({
                category,
                amount,
              })
            )
            .sort(
              (a, b) =>
                b.amount -
                a.amount
            );

        /* ------------------------------------
           CASH FLOW AND PROFIT
        ------------------------------------ */

        const calculatedNetCashFlow =
          collected -
          expenseTotal;

        const calculatedNetProfit =
          calculatedGrossProfit -
          expenseTotal;

        /* ------------------------------------
           INVENTORY VALUES
        ------------------------------------ */

        let rawValue = 0;
        let finishedValue = 0;
        let rawCount = 0;
        let finishedCount = 0;

        inventoryRows.forEach(
          (item) => {
            const quantity =
              Number(
                item.quantity || 0
              );

            const unitCost =
              Number(
                item.unit_cost || 0
              );

            const value =
              quantity *
              unitCost;

            const category =
              item.category
                ?.trim()
                .toLowerCase();

            const isFinishedGoods =
              category ===
                "finished goods" ||
              category ===
                "finished good" ||
              item.item_name
                ?.toLowerCase()
                .includes("block");

            if (
              isFinishedGoods
            ) {
              finishedValue +=
                value;

              finishedCount +=
                1;
            } else {
              rawValue +=
                value;

              rawCount +=
                1;
            }
          }
        );

        // Finished goods are stored in their own table.
        // Do not depend on the raw inventory table for block stock.
        finishedValue +=
          finishedGoodsRows.reduce(
            (sum, item) =>
              sum +
              Number(item.total_cost ?? (Number(item.quantity || 0) * Number(item.unit_cost || 0))),
            0
          );

        finishedCount +=
          finishedGoodsRows.length;

        const finishedGoodsUncosted =
          finishedGoodsRows.filter(
            (item) =>
              Number(item.quantity || 0) > 0 &&
              Number(item.unit_cost || 0) <= 0
          ).length;

        const blockInventory =
          inventoryRows.filter(
            (item) =>
              item.item_name
                ?.toLowerCase()
                .includes(
                  "block"
                )
          );

        const uncosted =
          blockInventory.filter(
            (item) =>
              Number(
                item.quantity || 0
              ) > 0 &&
              Number(
                item.unit_cost || 0
              ) <= 0
          ).length + finishedGoodsUncosted;

        /* ------------------------------------
           UPDATE STATE
        ------------------------------------ */

        if (!mounted) {
          return;
        }

        setSalesTotal(
          totalSales
        );

        setProductionTotal(
          totalProduction
        );

        setProductCount(
          Math.max(
            inventoryRows.length,
            finishedGoodsRows.length
          )
        );

        setLowStockCount(
          alertItems.length
        );

        setLowStockItems(
          alertItems
        );

        setRecentSales(
          (
            recentSalesData || []
          ) as DashboardRecentSale[]
        );

        setRecentProduction(
          (
            recentProductionData || []
          ) as DashboardProductionRecord[]
        );

        setMonthlySales(
          monthlySaleRows
        );

        setMonthlyProduction(
          (
            monthlyProductionData || []
          ) as MonthlyProductionRecord[]
        );

        setTotalCollected(
          collected
        );

        setOutstandingReceivables(
          outstanding
        );

        setCustomersOwing(
          owingCustomers.size
        );

        setCurrentReceivables(
          current
        );

        setDays31to60(
          thirtyOneToSixty
        );

        setDays61to90(
          sixtyOneToNinety
        );

        setDays90Plus(
          ninetyPlus
        );

        setTotalCogs(
          calculatedCogs
        );

        setGrossProfit(
          calculatedGrossProfit
        );

        setGrossMargin(
          calculatedGrossMargin
        );

        setTotalExpenses(
          expenseTotal
        );

        setNetCashFlow(
          calculatedNetCashFlow
        );

        setNetProfit(
          calculatedNetProfit
        );

        setExpenseCount(
          expenseRows.length
        );

        setExpenseCategories(
          categorySummary
        );

        setRawMaterialValue(
          rawValue
        );

        setFinishedGoodsValue(
          finishedValue
        );

        setRawMaterialItems(
          rawCount
        );

        setFinishedGoodsItems(
          finishedCount
        );

        setUncostedFinishedGoods(
          uncosted
        );
      } catch (error) {
        console.error(
          "Dashboard error:",
          error
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  /* ========================================
     BUILD 12-MONTH CHART DATA
  ======================================== */

  const monthlyChartData =
    useMemo<
      MonthlyChartData[]
    >(
      () => {
        const months =
          new Map<
            string,
            MonthlyChartData
          >();

        const today =
          new Date();

        for (
          let index = 11;
          index >= 0;
          index--
        ) {
          const date =
            new Date(
              today.getFullYear(),
              today.getMonth() -
                index,
              1
            );

          const key =
            getMonthKey(
              date
            );

          months.set(
            key,
            {
              key,
              month:
                date.toLocaleDateString(
                  "en-GH",
                  {
                    month: "short",
                    year: "2-digit",
                  }
                ),
              sales: 0,
              production: 0,
              profit: 0,
              credit: 0,
            }
          );
        }

        monthlySales.forEach(
          (sale) => {
            if (
              !sale.created_at
            ) {
              return;
            }

            const date =
              new Date(
                sale.created_at
              );

            if (
              Number.isNaN(
                date.getTime()
              )
            ) {
              return;
            }

            const key =
              getMonthKey(
                date
              );

            const month =
              months.get(
                key
              );

            if (!month) {
              return;
            }

            month.sales +=
              Number(
                sale.total_amount || 0
              );

            month.profit +=
              Number(
                sale.gross_profit || 0
              );

            month.credit +=
              Math.max(
                0,
                Number(
                  sale.balance_due || 0
                )
              );
          }
        );

        monthlyProduction.forEach(
          (record) => {
            if (
              !record.created_at
            ) {
              return;
            }

            const date =
              new Date(
                record.created_at
              );

            if (
              Number.isNaN(
                date.getTime()
              )
            ) {
              return;
            }

            const key =
              getMonthKey(
                date
              );

            const month =
              months.get(
                key
              );

            if (!month) {
              return;
            }

            month.production +=
              Number(
                record.quantity || 0
              );
          }
        );

        return Array.from(
          months.values()
        );
      },
      [
        monthlySales,
        monthlyProduction,
      ]
    );

  if (loading) {
    return (
      <main className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-7">
        <p role="status" className="text-sm font-medium text-[#52685d]">Loading dashboard…</p>
        <div aria-hidden="true" className="grid grid-cols-2 gap-4 motion-safe:animate-pulse xl:grid-cols-4">
          {[0, 1, 2, 3].map(card => <div key={card} className="h-28 rounded-xl bg-[#e4ebe6]" />)}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1600px] space-y-8 p-4 sm:p-7">
      <header className="flex flex-wrap items-end justify-between gap-6 rounded-2xl bg-[#204a39] p-6 text-white sm:p-8">
        <div className="max-w-xl">
          <p className="text-xs font-semibold tracking-widest text-[#efcc86] uppercase">Rexy Blocks Factory</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Operations overview</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#d7e5dc]">
            Monitor sales, production, stock and cash flow across the factory.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/financials/profit-loss" className="rounded-lg border border-white/40 px-4 py-2.5 text-sm font-semibold hover:bg-white/10">
            Profit &amp; loss
          </Link>
          <Link href="/receivables/aging" className="rounded-lg bg-[#efcc86] px-4 py-2.5 text-sm font-semibold text-[#203a2e] hover:bg-[#f6dca6]">
            Receivables aging
          </Link>
        </div>
      </header>

      {/* OPERATIONAL STATS */}

      <DashboardStats
        salesTotal={salesTotal}
        productionTotal={productionTotal}
        productCount={productCount}
        lowStockCount={lowStockCount}
      />

      {/* FINANCIAL CENTER */}

      <section className="space-y-4">

        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Financial Management Center
          </h2>

          <p className="text-sm text-gray-500">
            Revenue, production cost,
            profitability, collections,
            and operating expenses.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          <div className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Revenue
            </p>

            <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">
              {money(salesTotal)}
            </p>
          </div>

          <div className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Cost of Goods Sold
            </p>

            <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">
              {money(totalCogs)}
            </p>
          </div>

          <div className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Gross Profit
            </p>

            <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">
              {money(grossProfit)}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Margin: {percent(grossMargin)}
            </p>
          </div>

          <div className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Net Profit
            </p>

            <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">
              {money(netProfit)}
            </p>
          </div>

        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          <div className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Cash Collected
            </p>

            <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">
              {money(totalCollected)}
            </p>
          </div>

          <div className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Outstanding Credit
            </p>

            <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">
              {money(
                outstandingReceivables
              )}
            </p>
          </div>

          <div className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Expenses
            </p>

            <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">
              {money(totalExpenses)}
            </p>
          </div>

          <div className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Net Cash Flow
            </p>

            <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">
              {money(netCashFlow)}
            </p>
          </div>

        </div>

      </section>

      {/* MONTHLY CHARTS */}

      <section className="space-y-6">

        <div>
          <h2 className="text-xl font-semibold tracking-tight tabular-nums">
            Monthly Business Performance
          </h2>

          <p className="text-sm text-gray-500">
            Sales, production, profit,
            and outstanding credit for
            the last 12 months.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">

          {/* SALES CHART */}

          <div className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm">

            <h3 className="text-lg font-semibold">
              Monthly Sales
            </h3>

            <p className="mb-4 text-sm text-gray-500">
              Revenue generated each month.
            </p>

            <div className="h-[320px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <BarChart
                  data={monthlyChartData}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="month"
                  />

                  <YAxis />

                  <Tooltip
                    formatter={(
                      value
                    ) =>
                      money(
                        Number(value)
                      )
                    }
                  />

                  <Legend />

                  <Bar
                    dataKey="sales"
                    name="Sales"
                    fill="#285a44"
                    radius={[4, 4, 0, 0]}
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          </div>

          {/* PROFIT CHART */}

          <div className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm">

            <h3 className="text-lg font-semibold">
              Monthly Gross Profit
            </h3>

            <p className="mb-4 text-sm text-gray-500">
              Gross profit generated from sales.
            </p>

            <div className="h-[320px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <LineChart
                  data={monthlyChartData}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="month"
                  />

                  <YAxis />

                  <Tooltip
                    formatter={(
                      value
                    ) =>
                      money(
                        Number(value)
                      )
                    }
                  />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="Gross Profit"
                    stroke="#285a44"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                    }}
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>

          </div>

          {/* PRODUCTION CHART */}

          <div className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm">

            <h3 className="text-lg font-semibold">
              Monthly Production
            </h3>

            <p className="mb-4 text-sm text-gray-500">
              Total blocks produced each month.
            </p>

            <div className="h-[320px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <BarChart
                  data={monthlyChartData}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="month"
                  />

                  <YAxis />

                  <Tooltip
                    formatter={(
                      value
                    ) =>
                      number(
                        Number(value)
                      )
                    }
                  />

                  <Legend />

                  <Bar
                    dataKey="production"
                    name="Blocks Produced"
                    fill="#4e7870"
                    radius={[4, 4, 0, 0]}
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          </div>

          {/* CREDIT CHART */}

          <div className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm">

            <h3 className="text-lg font-semibold">
              Monthly Outstanding Credit
            </h3>

            <p className="mb-4 text-sm text-gray-500">
              Outstanding customer balances
              recorded by month.
            </p>

            <div className="h-[320px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <LineChart
                  data={monthlyChartData}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="month"
                  />

                  <YAxis />

                  <Tooltip
                    formatter={(
                      value
                    ) =>
                      money(
                        Number(value)
                      )
                    }
                  />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="credit"
                    name="Outstanding Credit"
                    stroke="#946120"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                    }}
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>

          </div>

        </div>

      </section>

      {/* INVENTORY */}

      <section className="space-y-4">

        <div>
          <h2 className="text-xl font-semibold tracking-tight tabular-nums">
            Inventory Control
          </h2>

          <p className="text-sm text-gray-500">
            Raw materials, finished goods,
            stock value, and costing.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          <div className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Raw Material Value
            </p>

            <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">
              {money(rawMaterialValue)}
            </p>

            <p className="text-xs text-gray-500">
              {rawMaterialItems} items
            </p>
          </div>

          <div className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Finished Goods Value
            </p>

            <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">
              {money(finishedGoodsValue)}
            </p>

            <p className="text-xs text-gray-500">
              {finishedGoodsItems} items
            </p>
          </div>

          <div className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Low Stock Alerts
            </p>

            <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">
              {number(lowStockCount)}
            </p>
          </div>

          <div className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Uncosted Finished Goods
            </p>

            <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">
              {number(
                uncostedFinishedGoods
              )}
            </p>
          </div>

        </div>

      </section>

      {/* EXPENSE BREAKDOWN */}

      {expenseCategories.length > 0 && (

        <section className="space-y-4">

          <div>
            <h2 className="text-xl font-semibold tracking-tight tabular-nums">
              Expense Breakdown
            </h2>

            <p className="text-sm text-gray-500">
              {expenseCount} expense records
              totaling{" "}
              {money(totalExpenses)}.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

            {expenseCategories.map(
              (item) => {
                const percentage =
                  totalExpenses > 0
                    ? (
                        item.amount /
                        totalExpenses
                      ) *
                      100
                    : 0;

                return (
                  <div
                    key={item.category}
                    className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm"
                  >

                    <div className="flex justify-between gap-4">

                      <p className="font-semibold">
                        {item.category}
                      </p>

                      <p className="font-bold">
                        {money(item.amount)}
                      </p>

                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">

                      <div
                        className="h-full rounded-full bg-[#285a44]"
                        style={{
                          width: `${Math.min(
                            percentage,
                            100
                          )}%`,
                        }}
                      />

                    </div>

                  </div>
                );
              }
            )}

          </div>

        </section>
      )}

      {/* RECEIVABLES */}

      <section className="space-y-4">

        <div>
          <h2 className="text-xl font-semibold tracking-tight tabular-nums">
            Accounts Receivable
          </h2>

          <p className="text-sm text-gray-500">
            Customer balances and payment aging.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          <div className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Total Collected
            </p>

            <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">
              {money(totalCollected)}
            </p>
          </div>

          <div className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Outstanding
            </p>

            <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">
              {money(
                outstandingReceivables
              )}
            </p>
          </div>

          <div className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Customers Owing
            </p>

            <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">
              {number(customersOwing)}
            </p>
          </div>

          <div className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Current (0–30 Days)
            </p>

            <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">
              {money(currentReceivables)}
            </p>
          </div>

        </div>

        <div className="grid gap-4 md:grid-cols-3">

          <div className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold">
              31–60 Days
            </p>

            <p className="mt-2 text-xl font-bold">
              {money(days31to60)}
            </p>
          </div>

          <div className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold">
              61–90 Days
            </p>

            <p className="mt-2 text-xl font-bold">
              {money(days61to90)}
            </p>
          </div>

          <div className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold">
              90+ Days
            </p>

            <p className="mt-2 text-xl font-bold">
              {money(days90Plus)}
            </p>
          </div>

        </div>

      </section>

      {/* LOW STOCK */}

      <LowStock
        items={lowStockItems}
      />

      {/* RECENT SALES */}

      <RecentSales
        sales={recentSales}
      />

      {/* LATEST 5 PRODUCTION RECORDS */}

      <ProductionHistory
        records={recentProduction}
      />

    </main>
  );
}

"use client";

import Link from "next/link";
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

interface Sale {
  id: string;
  customer_name: string | null;
  product_name?: string | null;
  quantity?: number | null;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  cost_per_unit?: number | null;
  cogs?: number | null;
  gross_profit?: number | null;
  gross_margin?: number | null;
  created_at: string;
}

interface Payment {
  id: string;
  sale_id: string;
  amount: number;
  created_at: string;
}

interface Expense {
  id: string;
  expense_name: string;
  category: string;
  amount: number;
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
  minimum_quantity: number;
}

function money(value: number): string {
  const number = Number(value || 0);

  return `GH₵${number.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function number(value: number, decimals = 0): string {
  const amount = Number(value || 0);

  return amount.toLocaleString("en-GH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function percent(value: number): string {
  const amount = Number(value || 0);

  return `${amount.toFixed(2)}%`;
}

export default function DashboardPage() {
  /*
   * ==========================================
   * OPERATIONAL DASHBOARD STATE
   * ==========================================
   */

  const [salesTotal, setSalesTotal] = useState(0);

  const [productionTotal, setProductionTotal] =
    useState(0);

  const [productCount, setProductCount] =
    useState(0);

  const [lowStockCount, setLowStockCount] =
    useState(0);

  const [
    lowStockItems,
    setLowStockItems,
  ] = useState<DashboardLowStockItem[]>([]);

  const [
    recentSales,
    setRecentSales,
  ] = useState<DashboardRecentSale[]>([]);

  const [
    recentProduction,
    setRecentProduction,
  ] = useState<DashboardProductionRecord[]>([]);

  /*
   * ==========================================
   * RECEIVABLES
   * ==========================================
   */

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

  /*
   * ==========================================
   * FINANCIAL STATE
   * ==========================================
   */

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
  ] = useState<ExpenseCategory[]>([]);

  /*
   * ==========================================
   * INVENTORY VALUE
   * ==========================================
   */

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

  /*
   * ==========================================
   * LOADING
   * ==========================================
   */

  const [loading, setLoading] =
    useState(true);

  /*
   * ==========================================
   * LOAD DASHBOARD
   * ==========================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);

        /*
         * --------------------------------------
         * RECENT SALES
         * --------------------------------------
         */

        const {
          data: sales,
          error: salesError,
        } = await supabase
          .from("sales")
          .select("*")
          .order("created_at", {
            ascending: false,
          })
          .limit(5);

        /*
         * --------------------------------------
         * RECENT PRODUCTION
         * --------------------------------------
         */

        const {
          data: production,
          error: productionError,
        } = await supabase
          .from("production")
          .select("*")
          .order("created_at", {
            ascending: false,
          })
          .limit(5);

        /*
         * --------------------------------------
         * INVENTORY
         * --------------------------------------
         */

        const {
          data: inventory,
          error: inventoryError,
        } = await supabase
          .from("inventory")
          .select("*");

        /*
         * --------------------------------------
         * STOCK ALERTS
         * --------------------------------------
         */

        const {
          data: alerts,
          error: alertsError,
        } = await supabase
          .from("stock_alerts")
          .select("*");

        /*
         * --------------------------------------
         * ALL SALES
         * --------------------------------------
         *
         * Required for:
         * Revenue
         * COGS
         * Gross Profit
         * Receivables
         * Collections
         */

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

        /*
         * --------------------------------------
         * ALL EXPENSES
         * --------------------------------------
         */

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
          .order("created_at", {
            ascending: false,
          });

        /*
         * --------------------------------------
         * ERROR LOGGING
         * --------------------------------------
         */

        if (salesError) {
          console.error(
            "Dashboard sales error:",
            salesError
          );
        }

        if (productionError) {
          console.error(
            "Dashboard production error:",
            productionError
          );
        }

        if (inventoryError) {
          console.error(
            "Dashboard inventory error:",
            inventoryError
          );
        }

        if (alertsError) {
          console.error(
            "Dashboard stock alerts error:",
            alertsError
          );
        }

        if (allSalesError) {
          console.error(
            "Dashboard all sales error:",
            allSalesError
          );
        }

        if (expensesError) {
          console.error(
            "Dashboard expenses error:",
            expensesError
          );
        }

        /*
         * --------------------------------------
         * NORMALIZE
         * --------------------------------------
         */

        const saleRows =
          (allSales || []) as Sale[];

        const inventoryRows =
          (inventory || []) as InventoryItem[];

        const alertRows =
          (alerts || []) as StockAlert[];

        const expenseRows =
          (expenses || []) as Expense[];

        /*
         * --------------------------------------
         * TOTAL REVENUE
         * --------------------------------------
         */

        const totalSales =
          saleRows.reduce(
            (sum, sale) =>
              sum +
              Number(
                sale.total_amount || 0
              ),
            0
          );

        /*
         * --------------------------------------
         * COGS
         * --------------------------------------
         *
         * Use the COGS recorded on each sale.
         *
         * If COGS is zero, it remains zero.
         * This prevents the dashboard from
         * inventing a production cost.
         */

        const calculatedCogs =
          saleRows.reduce(
            (sum, sale) =>
              sum +
              Math.max(
                0,
                Number(
                  sale.cogs || 0
                )
              ),
            0
          );

        /*
         * --------------------------------------
         * GROSS PROFIT
         * --------------------------------------
         */

        const calculatedGrossProfit =
          totalSales -
          calculatedCogs;

        /*
         * --------------------------------------
         * GROSS MARGIN
         * --------------------------------------
         */

        const calculatedGrossMargin =
          totalSales > 0
            ? (calculatedGrossProfit /
                totalSales) *
              100
            : 0;

        /*
         * --------------------------------------
         * RECENT PRODUCTION TOTAL
         * --------------------------------------
         */

        const totalProduction =
          (production || []).reduce(
            (
              sum,
              item
            ) =>
              sum +
              Number(
                item.quantity || 0
              ),
            0
          );

        /*
         * --------------------------------------
         * LOW STOCK
         * --------------------------------------
         */

        const alertItems:
          DashboardLowStockItem[] = [];

        alertRows.forEach(
          (alert) => {
            const item =
              inventoryRows.find(
                (inventoryItem) =>
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
                name: item.item_name,
                quantity: Number(
                  item.quantity || 0
                ),
              });
            }
          }
        );

        /*
         * --------------------------------------
         * RECEIVABLE PAYMENT LEDGER
         * --------------------------------------
         */

        const saleIds =
          saleRows.map(
            (sale) => sale.id
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
              (payments ||
                []) as Payment[];
          }
        }

        /*
         * --------------------------------------
         * PAYMENTS BY SALE
         * --------------------------------------
         */

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

        /*
         * --------------------------------------
         * RECEIVABLE CALCULATIONS
         * --------------------------------------
         */

        let collected = 0;
        let outstanding = 0;
        let current = 0;
        let thirtyOneToSixty = 0;
        let sixtyOneToNinety = 0;
        let ninetyPlus = 0;

        const owingCustomers =
          new Set<string>();

        const now =
          new Date();

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
                    sale.amount_paid ||
                      0
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
                    (1000 *
                      60 *
                      60 *
                      24)
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

        /*
         * --------------------------------------
         * EXPENSES
         * --------------------------------------
         */

        const expenseTotal =
          expenseRows.reduce(
            (sum, expense) =>
              sum +
              Number(
                expense.amount || 0
              ),
            0
          );

        /*
         * --------------------------------------
         * EXPENSE CATEGORIES
         * --------------------------------------
         */

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
              (categories.get(
                category
              ) || 0) +
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

        /*
         * --------------------------------------
         * NET CASH FLOW
         * --------------------------------------
         *
         * Cash accounting:
         *
         * Collections - Expenses
         */

        const calculatedNetCashFlow =
          collected -
          expenseTotal;

        /*
         * --------------------------------------
         * NET PROFIT
         * --------------------------------------
         *
         * Accrual-style operating result:
         *
         * Revenue
         * - COGS
         * - Expenses
         */

        const calculatedNetProfit =
          calculatedGrossProfit -
          expenseTotal;

        /*
         * --------------------------------------
         * INVENTORY VALUES
         * --------------------------------------
         */

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

        /*
         * --------------------------------------
         * FINISHED GOODS COST ALERT
         * --------------------------------------
         *
         * Inventory rows for block products
         * with zero cost are considered
         * uncosted.
         */

        const blockInventory =
          inventoryRows.filter(
            (item) =>
              item.item_name
                ?.toLowerCase()
                .includes("block")
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
          ).length;

        /*
         * --------------------------------------
         * UPDATE STATE
         * --------------------------------------
         */

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
          inventoryRows.length
        );

        setLowStockCount(
          alertItems.length
        );

        setLowStockItems(
          alertItems
        );

        setRecentSales(
          (sales ||
            []) as DashboardRecentSale[]
        );

        setRecentProduction(
          (production ||
            []) as DashboardProductionRecord[]
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

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ==========================================
   * RENDER
   * ==========================================
   */

  return (
    <main className="space-y-8 p-6">

      {/* =====================================
          HEADER
          ===================================== */}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

        <div>
          <h1 className="text-3xl font-bold">
            Rexy Blocks ERP Dashboard
          </h1>

          <p className="mt-1 text-gray-600">
            Management overview of sales,
            production, inventory, receivables,
            expenses, and profitability.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">

          <Link
            href="/financials/profit-loss"
            className="w-fit rounded-lg border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Profit & Loss
          </Link>

          <Link
            href="/receivables/aging"
            className="w-fit rounded-lg bg-black px-4 py-2 text-white hover:bg-gray-800"
          >
            Receivables Aging
          </Link>

        </div>

      </div>

      {/* =====================================
          OPERATIONAL STATS
          ===================================== */}

      <DashboardStats
        salesTotal={
          salesTotal
        }
        productionTotal={
          productionTotal
        }
        productCount={
          productCount
        }
        lowStockCount={
          lowStockCount
        }
      />

      {/* =====================================
          MANAGEMENT FINANCIAL CENTER
          ===================================== */}

      <section className="space-y-4">

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

          <div>
            <h2 className="text-2xl font-bold">
              Financial Management Center
            </h2>

            <p className="text-sm text-gray-500">
              Revenue, cost of sales,
              profitability, cash collection,
              and operating expenses.
            </p>
          </div>

          <Link
            href="/financials/profit-loss"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            View Full Profit & Loss →
          </Link>

        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          {/* REVENUE */}

          <div className="rounded-lg border bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Revenue
            </p>

            <p className="mt-2 text-2xl font-bold">
              {money(
                salesTotal
              )}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Total recorded sales
            </p>

          </div>

          {/* COGS */}

          <div className="rounded-lg border bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Cost of Goods Sold
            </p>

            <p className="mt-2 text-2xl font-bold text-orange-600">
              {money(
                totalCogs
              )}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Recorded production cost of sold blocks
            </p>

          </div>

          {/* GROSS PROFIT */}

          <div className="rounded-lg border bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Gross Profit
            </p>

            <p
              className={`mt-2 text-2xl font-bold ${
                grossProfit >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {money(
                grossProfit
              )}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Margin:{" "}
              {percent(
                grossMargin
              )}
            </p>

          </div>

          {/* NET PROFIT */}

          <div className="rounded-lg border bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Net Profit
            </p>

            <p
              className={`mt-2 text-2xl font-bold ${
                netProfit >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {money(
                netProfit
              )}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Gross profit minus expenses
            </p>

          </div>

        </div>

        {/* SECOND FINANCIAL ROW */}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          {/* COLLECTED */}

          <div className="rounded-lg border bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Cash Collected
            </p>

            <p className="mt-2 text-2xl font-bold text-green-600">
              {money(
                totalCollected
              )}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Actual customer payments
            </p>

          </div>

          {/* RECEIVABLES */}

          <div className="rounded-lg border bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Receivables
            </p>

            <p className="mt-2 text-2xl font-bold text-red-600">
              {money(
                outstandingReceivables
              )}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Money customers still owe
            </p>

          </div>

          {/* EXPENSES */}

          <div className="rounded-lg border bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Operating Expenses
            </p>

            <p className="mt-2 text-2xl font-bold text-red-600">
              {money(
                totalExpenses
              )}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Recorded business expenses
            </p>

          </div>

          {/* CASH FLOW */}

          <div className="rounded-lg border bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Net Cash Flow
            </p>

            <p
              className={`mt-2 text-2xl font-bold ${
                netCashFlow >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {money(
                netCashFlow
              )}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Cash collected minus expenses
            </p>

          </div>

        </div>

        {/* PROFITABILITY EXPLANATION */}

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">

          <h3 className="font-semibold text-blue-900">
            Profitability Summary
          </h3>

          <div className="mt-4 grid gap-4 md:grid-cols-4">

            <div>
              <p className="text-xs text-blue-700">
                Revenue
              </p>

              <p className="mt-1 font-bold text-blue-950">
                {money(
                  salesTotal
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-blue-700">
                COGS
              </p>

              <p className="mt-1 font-bold text-blue-950">
                {money(
                  totalCogs
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-blue-700">
                Gross Profit
              </p>

              <p className="mt-1 font-bold text-blue-950">
                {money(
                  grossProfit
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-blue-700">
                Net Profit
              </p>

              <p className="mt-1 font-bold text-blue-950">
                {money(
                  netProfit
                )}
              </p>
            </div>

          </div>

        </div>

      </section>

      {/* =====================================
          INVENTORY CONTROL
          ===================================== */}

      <section className="space-y-4">

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

          <div>
            <h2 className="text-2xl font-bold">
              Inventory Control
            </h2>

            <p className="text-sm text-gray-500">
              Raw materials, finished goods,
              stock value, and costing alerts.
            </p>
          </div>

          <Link
            href="/inventory"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            View Inventory →
          </Link>

        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          {/* RAW MATERIAL VALUE */}

          <div className="rounded-lg border bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Raw Material Value
            </p>

            <p className="mt-2 text-2xl font-bold">
              {money(
                rawMaterialValue
              )}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              {rawMaterialItems} inventory item
              {rawMaterialItems === 1
                ? ""
                : "s"}
            </p>

          </div>

          {/* FINISHED GOODS VALUE */}

          <div className="rounded-lg border bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Finished Goods Value
            </p>

            <p className="mt-2 text-2xl font-bold">
              {money(
                finishedGoodsValue
              )}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              {finishedGoodsItems} finished-goods
              item
              {finishedGoodsItems === 1
                ? ""
                : "s"}
            </p>

          </div>

          {/* LOW STOCK */}

          <div className="rounded-lg border bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Low Stock Alerts
            </p>

            <p
              className={`mt-2 text-2xl font-bold ${
                lowStockCount > 0
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              {number(
                lowStockCount
              )}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Items below minimum quantity
            </p>

          </div>

          {/* UNCOSTED */}

          <div className="rounded-lg border bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Uncosted Finished Goods
            </p>

            <p
              className={`mt-2 text-2xl font-bold ${
                uncostedFinishedGoods > 0
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              {number(
                uncostedFinishedGoods
              )}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Block inventory without a unit cost
            </p>

          </div>

        </div>

        {/* COSTING WARNING */}

        {uncostedFinishedGoods >
          0 && (
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-5">

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

              <div>

                <p className="font-semibold text-yellow-900">
                  Finished-goods costing requires attention
                </p>

                <p className="mt-1 text-sm text-yellow-800">
                  Some block inventory has quantity
                  but no production cost. This can
                  cause COGS and profit reports to be
                  incomplete.
                </p>

              </div>

              <Link
                href="/inventory"
                className="w-fit rounded-lg bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-700"
              >
                Review Inventory
              </Link>

            </div>

          </div>
        )}

      </section>

      {/* =====================================
          EXPENSE BREAKDOWN
          ===================================== */}

      {expenseCategories.length >
        0 && (
        <section className="space-y-4">

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

            <div>

              <h2 className="text-2xl font-bold">
                Expense Breakdown
              </h2>

              <p className="text-sm text-gray-500">
                Where the factory's money is being
                spent.
              </p>

            </div>

            <Link
              href="/expenses"
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              View Expenses →
            </Link>

          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

            {expenseCategories.map(
              (item) => {

                const percentage =
                  totalExpenses > 0
                    ? (item.amount /
                        totalExpenses) *
                      100
                    : 0;

                return (
                  <div
                    key={
                      item.category
                    }
                    className="rounded-lg border bg-white p-5 shadow-sm"
                  >

                    <div className="flex items-center justify-between gap-4">

                      <p className="font-semibold">
                        {item.category}
                      </p>

                      <p className="whitespace-nowrap font-bold">
                        {money(
                          item.amount
                        )}
                      </p>

                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">

                      <div
                        className="h-full rounded-full bg-black"
                        style={{
                          width: `${Math.min(
                            percentage,
                            100
                          )}%`,
                        }}
                      />

                    </div>

                    <p className="mt-2 text-xs text-gray-500">
                      {percentage.toFixed(
                        1
                      )}
                      % of total expenses
                    </p>

                  </div>
                );
              }
            )}

          </div>

          <p className="text-sm text-gray-500">

            {expenseCount} expense{" "}
            {expenseCount === 1
              ? "record"
              : "records"}{" "}
            totaling{" "}

            <span className="font-semibold text-gray-900">
              {money(
                totalExpenses
              )}
            </span>
            .

          </p>

        </section>
      )}

      {/* =====================================
          ACCOUNTS RECEIVABLE
          ===================================== */}

      <section className="space-y-4">

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

          <div>

            <h2 className="text-2xl font-bold">
              Accounts Receivable
            </h2>

            <p className="text-sm text-gray-500">
              Money collected and customer balances.
            </p>

          </div>

          <Link
            href="/receivables"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            View Receivables →
          </Link>

        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          {/* COLLECTED */}

          <div className="rounded-lg border bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Total Collected
            </p>

            <p className="mt-2 text-2xl font-bold text-green-600">
              {money(
                totalCollected
              )}
            </p>

          </div>

          {/* OUTSTANDING */}

          <div className="rounded-lg border bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Outstanding
            </p>

            <p className="mt-2 text-2xl font-bold text-red-600">
              {money(
                outstandingReceivables
              )}
            </p>

          </div>

          {/* CUSTOMERS OWING */}

          <div className="rounded-lg border bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Customers Owing
            </p>

            <p className="mt-2 text-2xl font-bold">
              {number(
                customersOwing
              )}
            </p>

          </div>

          {/* CURRENT */}

          <div className="rounded-lg border bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Current
            </p>

            <p className="mt-2 text-2xl font-bold">
              {money(
                currentReceivables
              )}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              0–30 days
            </p>

          </div>

        </div>

        {/* AGING */}

        <div className="grid gap-4 md:grid-cols-3">

          <div className="rounded-lg border bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm font-semibold">
                  31–60 Days
                </p>

                <p className="text-xs text-gray-500">
                  Moderate aging
                </p>

              </div>

              <p className="text-lg font-bold">
                {money(
                  days31to60
                )}
              </p>

            </div>

          </div>

          <div className="rounded-lg border bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm font-semibold">
                  61–90 Days
                </p>

                <p className="text-xs text-gray-500">
                  High aging
                </p>

              </div>

              <p className="text-lg font-bold">
                {money(
                  days61to90
                )}
              </p>

            </div>

          </div>

          <div className="rounded-lg border bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm font-semibold">
                  90+ Days
                </p>

                <p className="text-xs text-gray-500">
                  Severely overdue
                </p>

              </div>

              <p className="text-lg font-bold text-red-600">
                {money(
                  days90Plus
                )}
              </p>

            </div>

          </div>

        </div>

        {/* RECEIVABLE ACTION */}

        {outstandingReceivables >
          0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5">

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

              <div>

                <p className="font-semibold text-red-800">
                  Customer balances require attention
                </p>

                <p className="text-sm text-red-700">

                  {customersOwing}{" "}
                  customer
                  {customersOwing ===
                  1
                    ? ""
                    : "s"}{" "}
                  currently owe{" "}

                  {money(
                    outstandingReceivables
                  )}
                  .

                </p>

              </div>

              <Link
                href="/receivables/aging"
                className="w-fit rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Review Aging
              </Link>

            </div>

          </div>
        )}

      </section>

      {/* =====================================
          LOW STOCK
          ===================================== */}

      <LowStock
        items={
          lowStockItems
        }
      />

      {/* =====================================
          RECENT SALES
          ===================================== */}

      <RecentSales
        sales={
          recentSales
        }
      />

      {/* =====================================
          PRODUCTION HISTORY
          ===================================== */}

      <ProductionHistory
        records={
          recentProduction
        }
      />

    </main>
  );
}
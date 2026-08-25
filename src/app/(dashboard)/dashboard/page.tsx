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
  total_amount: number;
  amount_paid: number;
  balance_due: number;
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

function money(value: number) {
  return `GH₵${Number(value || 0).toLocaleString(
    "en-GH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

export default function DashboardPage() {
  /*
   * -----------------------------------
   * EXISTING DASHBOARD STATE
   * -----------------------------------
   */

  const [salesTotal, setSalesTotal] =
    useState(0);

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
   * -----------------------------------
   * RECEIVABLES
   * -----------------------------------
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
   * -----------------------------------
   * FINANCIAL SUMMARY
   * -----------------------------------
   */

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
   * -----------------------------------
   * LOAD DASHBOARD
   * -----------------------------------
   */

  useEffect(() => {
    async function loadDashboard() {
      try {
        /*
         * -----------------------------------
         * RECENT SALES
         * -----------------------------------
         *
         * This query intentionally remains
         * limited to 5 records because it is
         * used only by the Recent Sales widget.
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
         * -----------------------------------
         * RECENT PRODUCTION
         * -----------------------------------
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
         * -----------------------------------
         * INVENTORY
         * -----------------------------------
         */

        const {
          data: inventory,
          error: inventoryError,
        } = await supabase
          .from("inventory")
          .select("*");

        /*
         * -----------------------------------
         * STOCK ALERTS
         * -----------------------------------
         */

        const {
          data: alerts,
          error: alertsError,
        } = await supabase
          .from("stock_alerts")
          .select("*");

        /*
         * -----------------------------------
         * ALL SALES
         * -----------------------------------
         *
         * This query is NOT limited.
         *
         * It is used for:
         * - Total Sales
         * - Receivables
         * - Customer balances
         * - Aging
         */

        const {
          data: allSales,
          error: allSalesError,
        } = await supabase
          .from("sales")
          .select(
            `
              id,
              customer_name,
              total_amount,
              amount_paid,
              balance_due,
              created_at
            `
          );

        /*
         * -----------------------------------
         * ALL EXPENSES
         * -----------------------------------
         */

        const {
          data: expenses,
          error: expensesError,
        } = await supabase
          .from("expenses")
          .select(
            `
              id,
              expense_name,
              category,
              amount,
              notes,
              created_at
            `
          )
          .order("created_at", {
            ascending: false,
          });

        /*
         * -----------------------------------
         * ERROR LOGGING
         * -----------------------------------
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
         * -----------------------------------
         * NORMALIZE ALL SALES
         * -----------------------------------
         */

        const saleRows =
          (allSales || []) as Sale[];

        /*
         * -----------------------------------
         * TOTAL SALES
         * -----------------------------------
         *
         * IMPORTANT:
         *
         * Do NOT calculate this from the
         * "sales" variable because that query
         * contains only the latest 5 records.
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
         * -----------------------------------
         * TOTAL PRODUCTION
         * -----------------------------------
         *
         * This remains the latest 5 production
         * records because the existing
         * DashboardStats uses it as an
         * operational summary.
         */

        const totalProduction =
          production?.reduce(
            (sum, item) =>
              sum +
              Number(
                item.quantity || 0
              ),
            0
          ) ?? 0;

        /*
         * -----------------------------------
         * LOW STOCK
         * -----------------------------------
         */

        const alertItems: DashboardLowStockItem[] =
          [];

        alerts?.forEach((alert) => {
          const item =
            inventory?.find(
              (inventoryItem) =>
                inventoryItem.item_name ===
                alert.item_name
            );

          if (
            item &&
            Number(item.quantity) <
              Number(
                alert.minimum_quantity
              )
          ) {
            alertItems.push({
              name: item.item_name,
              quantity: Number(
                item.quantity
              ),
            });
          }
        });

        /*
         * -----------------------------------
         * EXISTING DASHBOARD STATE
         * -----------------------------------
         */

        setSalesTotal(
          totalSales
        );

        setProductionTotal(
          totalProduction
        );

        setProductCount(
          inventory?.length ?? 0
        );

        setLowStockCount(
          alertItems.length
        );

        setLowStockItems(
          alertItems
        );

        setRecentSales(
          (sales ??
            []) as DashboardRecentSale[]
        );

        setRecentProduction(
          (production ??
            []) as DashboardProductionRecord[]
        );

        /*
         * -----------------------------------
         * RECEIVABLES
         * -----------------------------------
         */

        const saleIds =
          saleRows.map(
            (sale) => sale.id
          );

        let paymentRows: Payment[] =
          [];

        /*
         * -----------------------------------
         * PAYMENT LEDGER
         * -----------------------------------
         */

        if (saleIds.length > 0) {
          const {
            data: payments,
            error: paymentsError,
          } = await supabase
            .from("sale_payments")
            .select(
              `
                id,
                sale_id,
                amount,
                created_at
              `
            )
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
         * -----------------------------------
         * PAYMENTS BY SALE
         * -----------------------------------
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
         * -----------------------------------
         * RECEIVABLE CALCULATIONS
         * -----------------------------------
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

            /*
             * Use the payment ledger
             * whenever payment records
             * exist.
             */

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

            /*
             * Total actual collections.
             */

            collected += paid;

            /*
             * Fully paid sale.
             */

            if (balance <= 0) {
              return;
            }

            /*
             * Outstanding balance.
             */

            outstanding +=
              balance;

            /*
             * Customer count.
             */

            const customer =
              sale.customer_name?.trim();

            if (customer) {
              owingCustomers.add(
                customer
              );
            }

            /*
             * Aging.
             */

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

            if (days <= 30) {
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
         * -----------------------------------
         * SET RECEIVABLE STATE
         * -----------------------------------
         */

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

        /*
         * -----------------------------------
         * EXPENSES
         * -----------------------------------
         */

        const expenseRows =
          (expenses ||
            []) as Expense[];

        /*
         * Total expenses.
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
         * Expense categories.
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
         * -----------------------------------
         * FINANCIAL CALCULATIONS
         * -----------------------------------
         *
         * Net Cash Flow:
         *
         * Actual money collected
         * minus
         * recorded expenses.
         *
         * Net Profit:
         *
         * Total sales
         * minus
         * recorded expenses.
         */

        const calculatedNetCashFlow =
          collected -
          expenseTotal;

        const calculatedNetProfit =
          totalSales -
          expenseTotal;

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
      } catch (error) {
        console.error(
          "Dashboard error:",
          error
        );
      }
    }

    loadDashboard();
  }, []);

  return (
    <main className="space-y-8 p-6">

      {/* ===================================
          HEADER
          =================================== */}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

        <div>
          <h1 className="text-3xl font-bold">
            Rexy Blocks ERP Dashboard
          </h1>

          <p className="mt-1 text-gray-600">
            Overview of sales, production,
            inventory, receivables, expenses,
            and cash flow.
          </p>
        </div>

        <Link
          href="/receivables/aging"
          className="w-fit rounded-lg bg-black px-4 py-2 text-white hover:bg-gray-800"
        >
          Receivables Aging
        </Link>

      </div>

      {/* ===================================
          EXISTING OPERATIONAL STATS
          =================================== */}

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

      {/* ===================================
          FINANCIAL OVERVIEW
          =================================== */}

      <section className="space-y-4">

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

          <div>
            <h2 className="text-2xl font-bold">
              Financial Overview
            </h2>

            <p className="text-sm text-gray-500">
              Sales, collections, expenses,
              profit, and cash flow.
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

          {/* TOTAL SALES */}

          <div className="rounded-lg border bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Total Sales
            </p>

            <p className="mt-2 text-2xl font-bold">
              {money(
                salesTotal
              )}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Total invoiced sales
            </p>

          </div>

          {/* TOTAL COLLECTED */}

          <div className="rounded-lg border bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Total Collected
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

          {/* OUTSTANDING */}

          <div className="rounded-lg border bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Outstanding Receivables
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
              Total Expenses
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

          {/* NET CASH FLOW */}

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
              Collected minus expenses
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
              Sales minus recorded expenses
            </p>

          </div>

        </div>

        {/* FINANCIAL POSITION */}

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">

          <h3 className="font-semibold text-blue-900">
            Financial Position
          </h3>

          <div className="mt-4 grid gap-4 md:grid-cols-4">

            <div>
              <p className="text-xs text-blue-700">
                Sales
              </p>

              <p className="mt-1 font-bold text-blue-950">
                {money(
                  salesTotal
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-blue-700">
                Collected
              </p>

              <p className="mt-1 font-bold text-blue-950">
                {money(
                  totalCollected
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-blue-700">
                Receivables
              </p>

              <p className="mt-1 font-bold text-blue-950">
                {money(
                  outstandingReceivables
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-blue-700">
                Expenses
              </p>

              <p className="mt-1 font-bold text-blue-950">
                {money(
                  totalExpenses
                )}
              </p>
            </div>

          </div>

        </div>

      </section>

      {/* ===================================
          EXPENSE BREAKDOWN
          =================================== */}

      {expenseCategories.length >
        0 && (
        <section className="space-y-4">

          <div>
            <h2 className="text-2xl font-bold">
              Expense Breakdown
            </h2>

            <p className="text-sm text-gray-500">
              Where the factory's money is
              being spent.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

            {expenseCategories.map(
              (item) => {
                const percentage =
                  totalExpenses >
                  0
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
                        {
                          item.category
                        }
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
            {expenseCount ===
            1
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

      {/* ===================================
          ACCOUNTS RECEIVABLE
          =================================== */}

      <section className="space-y-4">

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

          <div>
            <h2 className="text-2xl font-bold">
              Accounts Receivable
            </h2>

            <p className="text-sm text-gray-500">
              Money collected and customer
              balances.
            </p>
          </div>

          <Link
            href="/receivables"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            View Receivables →
          </Link>

        </div>

        {/* RECEIVABLE CARDS */}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          {/* TOTAL COLLECTED */}

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
              {customersOwing}
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

        {/* AGING BREAKDOWN */}

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
                  Customer balances require
                  attention
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

      {/* ===================================
          LOW STOCK
          =================================== */}

      <LowStock
        items={
          lowStockItems
        }
      />

      {/* ===================================
          RECENT SALES
          =================================== */}

      <RecentSales
        sales={
          recentSales
        }
      />

      {/* ===================================
          PRODUCTION HISTORY
          =================================== */}

      <ProductionHistory
        records={
          recentProduction
        }
      />

    </main>
  );
}
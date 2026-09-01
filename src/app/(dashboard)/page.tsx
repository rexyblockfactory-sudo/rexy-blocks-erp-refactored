"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type MonthlyData = {
  month: string;
  sales: number;
  production: number;
  profit: number;
  credit: number;
};

type DashboardData = {
  dailySales: number;
  dailyProduction: number;
  inventoryValue: number;
  outstandingCredit: number;
  grossProfit: number;
  recentSales: any[];
  lowStockItems: any[];
  monthlyData: MonthlyData[];
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  const [dashboard, setDashboard] =
    useState<DashboardData>({
      dailySales: 0,
      dailyProduction: 0,
      inventoryValue: 0,
      outstandingCredit: 0,
      grossProfit: 0,
      recentSales: [],
      lowStockItems: [],
      monthlyData: [],
    });

  function formatMoney(
    value: number | string | null | undefined
  ) {
    const amount = Number(value ?? 0);

    return `GH₵${amount.toFixed(2)}`;
  }

  function formatNumber(
    value: number | string | null | undefined
  ) {
    return Number(value ?? 0).toLocaleString();
  }

  function getTodayRange() {
    const now = new Date();

    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0
    );

    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0
    );

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  function createMonthlyData() {
    const months: MonthlyData[] = [];

    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );

      months.push({
        month: date.toLocaleString(
          "default",
          {
            month: "short",
          }
        ),
        sales: 0,
        production: 0,
        profit: 0,
        credit: 0,
      });
    }

    return months;
  }

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const { start, end } =
        getTodayRange();

      const sixMonthsAgo =
        new Date();

      sixMonthsAgo.setMonth(
        sixMonthsAgo.getMonth() - 5
      );

      sixMonthsAgo.setDate(1);

      sixMonthsAgo.setHours(
        0,
        0,
        0,
        0
      );

      // =====================================================
      // LOAD SALES
      // =====================================================

      const {
        data: allSalesData,
        error: salesError,
      } = await supabase
        .from("sales")
        .select("*")
        .gte(
          "created_at",
          sixMonthsAgo.toISOString()
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        );

      if (salesError) {
        console.error(
          "Dashboard sales error:",
          salesError
        );
      }

      const allSales =
        allSalesData ?? [];

      // =====================================================
      // TODAY SALES
      // =====================================================

      const todaySales =
        allSales.filter((sale) => {
          const date =
            new Date(
              sale.created_at
            );

          return (
            date >=
              new Date(start) &&
            date <
              new Date(end)
          );
        });

      const dailySales =
        todaySales.reduce(
          (sum, sale) =>
            sum +
            Number(
              sale.total_amount ?? 0
            ),
          0
        );

      const grossProfit =
        todaySales.reduce(
          (sum, sale) =>
            sum +
            Number(
              sale.gross_profit ?? 0
            ),
          0
        );

      // =====================================================
      // LOAD PRODUCTION
      // =====================================================

      const {
        data: productionData,
        error: productionError,
      } = await supabase
        .from("production")
        .select("*")
        .gte(
          "created_at",
          sixMonthsAgo.toISOString()
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        );

      if (productionError) {
        console.error(
          "Dashboard production error:",
          productionError
        );
      }

      const productions =
        productionData ?? [];

      const dailyProduction =
        productions
          .filter((production) => {
            const date =
              new Date(
                production.created_at
              );

            return (
              date >=
                new Date(start) &&
              date <
                new Date(end)
            );
          })
          .reduce(
            (
              sum,
              production
            ) =>
              sum +
              Number(
                production.quantity ?? 0
              ),
            0
          );

      // =====================================================
      // RAW INVENTORY
      // =====================================================

      const {
        data: inventoryData,
        error: inventoryError,
      } = await supabase
        .from("inventory")
        .select(
          "id, item_name, quantity, unit_cost"
        );

      if (inventoryError) {
        console.error(
          "Inventory error:",
          inventoryError
        );
      }

      const inventory =
        inventoryData ?? [];

      const rawInventoryValue =
        inventory.reduce(
          (sum, item) =>
            sum +
            Number(
              item.quantity ?? 0
            ) *
              Number(
                item.unit_cost ?? 0
              ),
          0
        );

      // =====================================================
      // FINISHED GOODS
      // =====================================================

      const {
        data: finishedGoodsData,
        error: finishedGoodsError,
      } = await supabase
        .from("finished_goods_inventory")
        .select("*");

      if (finishedGoodsError) {
        console.error(
          "Finished goods error:",
          finishedGoodsError
        );
      }

      const finishedGoods =
        finishedGoodsData ?? [];

      const finishedGoodsValue =
        finishedGoods.reduce(
          (sum, item) =>
            sum +
            Number(
              item.quantity ?? 0
            ) *
              Number(
                item.unit_cost ?? 0
              ),
          0
        );

      const inventoryValue =
        rawInventoryValue +
        finishedGoodsValue;

      // =====================================================
      // OUTSTANDING CREDIT
      // =====================================================

      const outstandingCredit =
        allSales.reduce(
          (sum, sale) =>
            sum +
            Math.max(
              0,
              Number(
                sale.balance_due ?? 0
              )
            ),
          0
        );

      // =====================================================
      // LOW STOCK
      // =====================================================

      const lowStockItems =
        inventory.filter(
          (item) =>
            Number(
              item.quantity ?? 0
            ) <= 10
        );

      // =====================================================
      // MONTHLY DATA
      // =====================================================

      const monthlyData =
        createMonthlyData();

      allSales.forEach(
        (sale) => {
          const saleDate =
            new Date(
              sale.created_at
            );

          const month =
            saleDate.toLocaleString(
              "default",
              {
                month: "short",
              }
            );

          const targetMonth =
            monthlyData.find(
              (item) =>
                item.month === month
            );

          if (targetMonth) {
            targetMonth.sales +=
              Number(
                sale.total_amount ?? 0
              );

            targetMonth.profit +=
              Number(
                sale.gross_profit ?? 0
              );

            targetMonth.credit +=
              Number(
                sale.balance_due ?? 0
              );
          }
        }
      );

      productions.forEach(
        (production) => {
          const productionDate =
            new Date(
              production.created_at
            );

          const month =
            productionDate.toLocaleString(
              "default",
              {
                month: "short",
              }
            );

          const targetMonth =
            monthlyData.find(
              (item) =>
                item.month === month
            );

          if (targetMonth) {
            targetMonth.production +=
              Number(
                production.quantity ?? 0
              );
          }
        }
      );

      // =====================================================
      // RECENT SALES
      // =====================================================

      const recentSales =
        [...allSales]
          .reverse()
          .slice(0, 10);

      // =====================================================
      // UPDATE STATE
      // =====================================================

      setDashboard({
        dailySales,
        dailyProduction,
        inventoryValue,
        outstandingCredit,
        grossProfit,
        recentSales,
        lowStockItems,
        monthlyData,
      });
    } catch (error) {
      console.error(
        "Dashboard error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <main className="space-y-6">
        <h1 className="text-3xl font-bold">
          Dashboard
        </h1>

        <div className="rounded-xl border bg-white p-8 text-center">
          Loading dashboard...
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-8">

      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h1 className="text-3xl font-bold">
            Rexy Blocks Factory
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Business performance dashboard
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void loadDashboard();
          }}
          className="rounded-lg bg-black px-5 py-2 text-sm font-semibold text-white"
        >
          Refresh Dashboard
        </button>

      </div>

      {/* SUMMARY */}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Today's Sales
          </p>

          <p className="mt-2 text-2xl font-bold">
            {formatMoney(
              dashboard.dailySales
            )}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Today's Production
          </p>

          <p className="mt-2 text-2xl font-bold">
            {formatNumber(
              dashboard.dailyProduction
            )}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Inventory Value
          </p>

          <p className="mt-2 text-2xl font-bold">
            {formatMoney(
              dashboard.inventoryValue
            )}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Outstanding Credit
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {formatMoney(
              dashboard.outstandingCredit
            )}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Today's Profit
          </p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {formatMoney(
              dashboard.grossProfit
            )}
          </p>
        </div>

      </section>

      {/* MONTHLY SALES */}

      <section className="rounded-xl border bg-white p-6 shadow-sm">

        <h2 className="text-xl font-semibold">
          Monthly Sales & Profit
        </h2>

        <p className="mb-6 text-sm text-gray-500">
          Last six months
        </p>

        <div className="h-[350px]">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <LineChart
              data={
                dashboard.monthlyData
              }
            >

              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="month"
              />

              <YAxis />

              <Tooltip />

              <Legend />

              <Line
                type="monotone"
                dataKey="sales"
                name="Sales"
                stroke="#2563eb"
                strokeWidth={3}
              />

              <Line
                type="monotone"
                dataKey="profit"
                name="Profit"
                stroke="#16a34a"
                strokeWidth={3}
              />

            </LineChart>

          </ResponsiveContainer>

        </div>

      </section>

      {/* MONTHLY PRODUCTION */}

      <section className="rounded-xl border bg-white p-6 shadow-sm">

        <h2 className="text-xl font-semibold">
          Monthly Production
        </h2>

        <p className="mb-6 text-sm text-gray-500">
          Total blocks produced per month
        </p>

        <div className="h-[350px]">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <BarChart
              data={
                dashboard.monthlyData
              }
            >

              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="month"
              />

              <YAxis />

              <Tooltip />

              <Legend />

              <Bar
                dataKey="production"
                name="Blocks Produced"
                fill="#f97316"
              />

            </BarChart>

          </ResponsiveContainer>

        </div>

      </section>

      {/* MONTHLY CREDIT */}

      <section className="rounded-xl border bg-white p-6 shadow-sm">

        <h2 className="text-xl font-semibold">
          Monthly Outstanding Credit
        </h2>

        <p className="mb-6 text-sm text-gray-500">
          Customer balances from sales
        </p>

        <div className="h-[350px]">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <BarChart
              data={
                dashboard.monthlyData
              }
            >

              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="month"
              />

              <YAxis />

              <Tooltip />

              <Legend />

              <Bar
                dataKey="credit"
                name="Outstanding Credit"
                fill="#dc2626"
              />

            </BarChart>

          </ResponsiveContainer>

        </div>

      </section>

      {/* RECENT SALES */}

      <section className="rounded-xl border bg-white shadow-sm">

        <div className="border-b p-5">

          <h2 className="text-xl font-semibold">
            Recent Sales
          </h2>

        </div>

        <div className="overflow-x-auto">

          <table className="min-w-full divide-y">

            <thead className="bg-gray-50">

              <tr>

                <th className="px-4 py-3 text-left text-xs font-semibold">
                  Customer
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold">
                  Product
                </th>

                <th className="px-4 py-3 text-right text-xs font-semibold">
                  Qty
                </th>

                <th className="px-4 py-3 text-right text-xs font-semibold">
                  Total
                </th>

                <th className="px-4 py-3 text-right text-xs font-semibold">
                  Balance
                </th>

              </tr>

            </thead>

            <tbody className="divide-y">

              {dashboard.recentSales.map(
                (sale) => (

                  <tr
                    key={sale.id}
                  >

                    <td className="px-4 py-4">
                      {sale.customer_name}
                    </td>

                    <td className="px-4 py-4">
                      {sale.product_name}
                    </td>

                    <td className="px-4 py-4 text-right">
                      {sale.quantity}
                    </td>

                    <td className="px-4 py-4 text-right font-semibold">
                      {formatMoney(
                        sale.total_amount
                      )}
                    </td>

                    <td className="px-4 py-4 text-right">

                      {formatMoney(
                        sale.balance_due
                      )}

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      </section>

    </main>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import InventoryForm from "@/components/forms/InventoryForm";
import { supabase } from "@/lib/supabase/client";

interface InventoryItem {
  id: string;
  item_name: string;
  category: string;
  unit: string;
  quantity: number;
  unit_cost: number;
  created_at: string;
}

interface ProductionRecord {
  id: string;
  product_name: string;
  quantity: number;
  created_at: string;
}

interface Sale {
  id: string;
  product_name: string;
  quantity: number;
  created_at: string;
}

interface Reconciliation {
  item: InventoryItem;
  produced: number;
  sold: number;
  calculatedQuantity: number;
  difference: number;
  status: "Balanced" | "Difference";
}

function number(value: number) {
  return Number(value || 0);
}

function money(value: number) {
  return `GH₵${number(value).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<
    InventoryItem[]
  >([]);

  const [production, setProduction] = useState<
    ProductionRecord[]
  >([]);

  const [sales, setSales] = useState<Sale[]>([]);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [search, setSearch] = useState("");

  const [showLowStock, setShowLowStock] =
    useState(false);

  async function loadInventory() {
    setLoading(true);
    setErrorMessage("");

    try {
      const [
        inventoryResult,
        productionResult,
        salesResult,
      ] = await Promise.all([
        supabase
          .from("inventory")
          .select("*")
          .order("item_name", {
            ascending: true,
          }),

        supabase
          .from("production")
          .select(
            "id, product_name, quantity, created_at"
          )
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("sales")
          .select(
            "id, product_name, quantity, created_at"
          )
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (inventoryResult.error) {
        throw new Error(
          `Inventory: ${inventoryResult.error.message}`
        );
      }

      if (productionResult.error) {
        throw new Error(
          `Production: ${productionResult.error.message}`
        );
      }

      if (salesResult.error) {
        throw new Error(
          `Sales: ${salesResult.error.message}`
        );
      }

      setInventory(
        (inventoryResult.data ||
          []) as InventoryItem[]
      );

      setProduction(
        (productionResult.data ||
          []) as ProductionRecord[]
      );

      setSales(
        (salesResult.data ||
          []) as Sale[]
      );
    } catch (error) {
      console.error(
        "Inventory reconciliation error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load inventory."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  /*
   * Production totals by product.
   */
  const productionByProduct = useMemo(() => {
    const map = new Map<
      string,
      number
    >();

    production.forEach((record) => {
      const name =
        record.product_name
          ?.trim()
          .toLowerCase();

      if (!name) {
        return;
      }

      map.set(
        name,
        (map.get(name) || 0) +
          number(record.quantity)
      );
    });

    return map;
  }, [production]);

  /*
   * Sales totals by product.
   */
  const salesByProduct = useMemo(() => {
    const map = new Map<
      string,
      number
    >();

    sales.forEach((sale) => {
      const name =
        sale.product_name
          ?.trim()
          .toLowerCase();

      if (!name) {
        return;
      }

      map.set(
        name,
        (map.get(name) || 0) +
          number(sale.quantity)
      );
    });

    return map;
  }, [sales]);

  /*
   * Build reconciliation.
   *
   * Calculated quantity:
   *
   * production - sales
   *
   * Difference:
   *
   * database inventory - calculated quantity
   */
  const reconciled = useMemo(() => {
    return inventory.map((item) => {
      const key =
        item.item_name
          ?.trim()
          .toLowerCase();

      const produced =
        productionByProduct.get(key) ||
        0;

      const sold =
        salesByProduct.get(key) ||
        0;

      const calculatedQuantity =
        produced - sold;

      const difference =
        number(item.quantity) -
        calculatedQuantity;

      return {
        item,
        produced,
        sold,
        calculatedQuantity,
        difference,
        status:
          Math.abs(difference) < 0.000001
            ? "Balanced"
            : "Difference",
      } satisfies Reconciliation;
    });
  }, [
    inventory,
    productionByProduct,
    salesByProduct,
  ]);

  /*
   * Low stock.
   *
   * We use a simple threshold of 20
   * units because the current
   * inventory interface does not
   * contain a minimum_quantity field.
   */
  const LOW_STOCK_THRESHOLD = 20;

  const lowStockCount =
    inventory.filter(
      (item) =>
        number(item.quantity) <=
        LOW_STOCK_THRESHOLD
    ).length;

  const differenceCount =
    reconciled.filter(
      (item) =>
        item.status === "Difference"
    ).length;

  const totalQuantity =
    inventory.reduce(
      (sum, item) =>
        sum + number(item.quantity),
      0
    );

  const inventoryValue =
    inventory.reduce(
      (sum, item) =>
        sum +
        number(item.quantity) *
          number(item.unit_cost),
      0
    );

  const filtered =
    reconciled.filter((record) => {
      const query =
        search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        record.item.item_name
          .toLowerCase()
          .includes(query) ||
        record.item.category
          ?.toLowerCase()
          .includes(query);

      const matchesLowStock =
        !showLowStock ||
        number(record.item.quantity) <=
          LOW_STOCK_THRESHOLD;

      return (
        matchesSearch &&
        matchesLowStock
      );
    });

  return (
    <main className="space-y-8 p-6">

      {/* HEADER */}

      <div>
        <h1 className="text-3xl font-bold">
          Inventory
        </h1>

        <p className="mt-1 text-gray-600">
          Manage stock and reconcile
          inventory against production
          and sales.
        </p>
      </div>

      {/* INVENTORY FORM */}

      <section className="rounded-lg border bg-white p-6 shadow-sm">

        <h2 className="mb-5 text-xl font-bold">
          Add Inventory Item
        </h2>

        <InventoryForm />

      </section>

      {/* ERROR */}

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">

          <p className="font-semibold">
            Inventory Error
          </p>

          <p className="mt-1 text-sm">
            {errorMessage}
          </p>

        </div>
      )}

      {/* SUMMARY */}

      <section className="grid gap-4 md:grid-cols-4">

        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Inventory Items
          </p>

          <p className="mt-2 text-2xl font-bold">
            {inventory.length}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Quantity
          </p>

          <p className="mt-2 text-2xl font-bold">
            {totalQuantity.toLocaleString()}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Inventory Value
          </p>

          <p className="mt-2 text-2xl font-bold">
            {money(inventoryValue)}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Low Stock
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {lowStockCount}
          </p>
        </div>

      </section>

      {/* RECONCILIATION STATUS */}

      <section className="grid gap-4 md:grid-cols-2">

        <div className="rounded-lg border bg-green-50 p-5">
          <p className="text-sm text-green-700">
            Balanced Items
          </p>

          <p className="mt-2 text-2xl font-bold text-green-700">
            {
              reconciled.filter(
                (record) =>
                  record.status ===
                  "Balanced"
              ).length
            }
          </p>
        </div>

        <div className="rounded-lg border bg-yellow-50 p-5">
          <p className="text-sm text-yellow-700">
            Reconciliation Differences
          </p>

          <p className="mt-2 text-2xl font-bold text-yellow-700">
            {differenceCount}
          </p>
        </div>

      </section>

      {/* SEARCH / FILTER */}

      <section className="rounded-lg border bg-white p-5 shadow-sm">

        <div className="flex flex-col gap-4 md:flex-row md:items-end">

          <div className="flex-1">

            <label
              htmlFor="inventory-search"
              className="mb-2 block text-sm font-semibold"
            >
              Search Inventory
            </label>

            <input
              id="inventory-search"
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search product or category..."
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
            />

          </div>

          <button
            type="button"
            onClick={() =>
              setShowLowStock(
                (value) => !value
              )
            }
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              showLowStock
                ? "bg-red-600 text-white"
                : "border bg-white hover:bg-gray-50"
            }`}
          >
            {showLowStock
              ? "Showing Low Stock"
              : "Show Low Stock"}
          </button>

          <button
            type="button"
            onClick={loadInventory}
            disabled={loading}
            className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>

        </div>

      </section>

      {/* INVENTORY TABLE */}

      {loading ? (

        <div className="rounded-lg border bg-white p-10 text-center">
          Loading inventory...
        </div>

      ) : (

        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">

          <table className="min-w-full">

            <thead className="bg-gray-50">

              <tr>

                <th className="border-b p-3 text-left text-sm font-semibold">
                  Product
                </th>

                <th className="border-b p-3 text-left text-sm font-semibold">
                  Category
                </th>

                <th className="border-b p-3 text-left text-sm font-semibold">
                  Unit
                </th>

                <th className="border-b p-3 text-right text-sm font-semibold">
                  Current Stock
                </th>

                <th className="border-b p-3 text-right text-sm font-semibold">
                  Produced
                </th>

                <th className="border-b p-3 text-right text-sm font-semibold">
                  Sold
                </th>

                <th className="border-b p-3 text-right text-sm font-semibold">
                  Calculated
                </th>

                <th className="border-b p-3 text-right text-sm font-semibold">
                  Difference
                </th>

                <th className="border-b p-3 text-center text-sm font-semibold">
                  Status
                </th>

                <th className="border-b p-3 text-right text-sm font-semibold">
                  Value
                </th>

              </tr>

            </thead>

            <tbody>

              {filtered.length === 0 ? (

                <tr>

                  <td
                    colSpan={10}
                    className="p-10 text-center text-gray-500"
                  >
                    No inventory items
                    found.
                  </td>

                </tr>

              ) : (

                filtered.map(
                  (record) => {
                    const quantity =
                      number(
                        record.item
                          .quantity
                      );

                    const lowStock =
                      quantity <=
                      LOW_STOCK_THRESHOLD;

                    return (
                      <tr
                        key={
                          record.item.id
                        }
                        className="border-b last:border-b-0 hover:bg-gray-50"
                      >

                        <td className="p-3 font-semibold">
                          {
                            record.item
                              .item_name
                          }
                        </td>

                        <td className="p-3">
                          {
                            record.item
                              .category
                          }
                        </td>

                        <td className="p-3">
                          {
                            record.item
                              .unit
                          }
                        </td>

                        <td
                          className={`p-3 text-right font-bold ${
                            lowStock
                              ? "text-red-600"
                              : ""
                          }`}
                        >
                          {quantity.toLocaleString()}
                        </td>

                        <td className="p-3 text-right">
                          {record.produced.toLocaleString()}
                        </td>

                        <td className="p-3 text-right">
                          {record.sold.toLocaleString()}
                        </td>

                        <td className="p-3 text-right">
                          {record.calculatedQuantity.toLocaleString()}
                        </td>

                        <td
                          className={`p-3 text-right font-semibold ${
                            record.difference ===
                            0
                              ? "text-green-600"
                              : "text-yellow-600"
                          }`}
                        >
                          {record.difference.toLocaleString()}
                        </td>

                        <td className="p-3 text-center">

                          {record.status ===
                          "Balanced" ? (

                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                              Balanced
                            </span>

                          ) : (

                            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                              Difference
                            </span>

                          )}

                        </td>

                        <td className="whitespace-nowrap p-3 text-right">
                          {money(
                            quantity *
                              number(
                                record.item
                                  .unit_cost
                              )
                          )}
                        </td>

                      </tr>
                    );
                  }
                )

              )}

            </tbody>

          </table>

        </div>

      )}

      {/* IMPORTANT RECONCILIATION NOTE */}

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-5 text-sm text-blue-800">

        <p className="font-semibold">
          Inventory reconciliation
        </p>

        <p className="mt-1">
          Calculated stock is based on
          production quantity minus sales
          quantity for matching product
          names. The Difference column
          compares that calculated value
          with the quantity currently stored
          in the inventory table.
        </p>

        <p className="mt-2">
          A difference does not automatically
          mean the inventory is wrong. It can
          represent opening stock, manual
          adjustments, damaged blocks, or
          historical transactions that were
          recorded before the reconciliation
          system was introduced.
        </p>

      </div>

    </main>
  );
}
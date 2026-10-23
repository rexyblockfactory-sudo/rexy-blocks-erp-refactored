"use client";
import RawMaterialsManager from "@/components/inventory/RawMaterialsManager";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  History,
  Package,
  Scale,
  Search,
  Warehouse,
} from "lucide-react";

import { supabase } from "@/lib/supabase/client";

/* ========================================
   TYPES
======================================== */

interface InventoryItem {
  id: string;
  item_name: string;
  category: string;
  unit: string;
  quantity: number;
  unit_cost: number;
}

interface ProductionRecord {
  id: string;
  product_name: string;
  quantity: number;
  created_at: string;
}

interface SaleRecord {
  id: string;
  product_name?: string;
  quantity: number;
  created_at: string;
}

interface InventoryMovement {
  id: string;
  inventory_id: string;
  item_name: string;
  movement_type: string;
  quantity: number;
  reason: string | null;
  created_by: string | null;
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

/* ========================================
   NUMBER HELPER
======================================== */

function number(value: unknown): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

/* ========================================
   CURRENCY FORMATTER
======================================== */

function formatCurrency(value: number) {
  return new Intl.NumberFormat(
    "en-GH",
    {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(value);
}

/* ========================================
   INVENTORY PAGE
======================================== */

export default function InventoryPage() {
  /* ========================================
     STATE
  ======================================== */

  const [inventory, setInventory] =
    useState<InventoryItem[]>([]);

  const [production, setProduction] =
    useState<ProductionRecord[]>([]);

  const [sales, setSales] =
    useState<SaleRecord[]>([]);

  const [movements, setMovements] =
    useState<InventoryMovement[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  /* ========================================
     LOAD DATA
  ======================================== */

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [
          inventoryResult,
          productionResult,
          salesResult,
          movementsResult,
        ] = await Promise.all([
          /* INVENTORY */

          supabase
            .from("inventory")
            .select(`
              id,
              item_name,
              category,
              unit,
              quantity,
              unit_cost
            `)
            .order(
              "item_name",
              {
                ascending: true,
              }
            ),

          /* PRODUCTION */

          supabase
            .from("production")
            .select(`
              id,
              product_name,
              quantity,
              created_at
            `)
            .order(
              "created_at",
              {
                ascending: false,
              }
            ),

          /* SALES */

          supabase
            .from("sales")
            .select(`
              id,
              product_name,
              quantity,
              created_at
            `)
            .order(
              "created_at",
              {
                ascending: false,
              }
            ),

          /* INVENTORY MOVEMENTS */

          supabase
            .from("inventory_movements")
            .select(`
              id,
              inventory_id,
              item_name,
              movement_type,
              quantity,
              reason,
              created_by,
              created_at
            `)
            .order(
              "created_at",
              {
                ascending: true,
              }
            ),
        ]);

        /* ====================================
           INVENTORY ERROR
        ==================================== */

        if (inventoryResult.error) {
          throw inventoryResult.error;
        }

        /* ====================================
           PRODUCTION ERROR
        ==================================== */

        if (productionResult.error) {
          console.error(
            "Production loading error:",
            productionResult.error
          );
        }

        /* ====================================
           SALES ERROR
        ==================================== */

        if (salesResult.error) {
          console.error(
            "Sales loading error:",
            salesResult.error
          );
        }

        /* ====================================
           MOVEMENTS ERROR
        ==================================== */

        if (movementsResult.error) {
          console.error(
            "Inventory movements error:",
            movementsResult.error
          );
        }

        /* ====================================
           SET INVENTORY
        ==================================== */

        setInventory(
          (inventoryResult.data || []).map(
            (item) => ({
              id: item.id,
              item_name:
                item.item_name || "",
              category:
                item.category || "",
              unit:
                item.unit || "",
              quantity:
                number(item.quantity),
              unit_cost:
                number(item.unit_cost),
            })
          )
        );

        /* ====================================
           SET PRODUCTION
        ==================================== */

        setProduction(
          (productionResult.data ||
            []).map((item) => ({
            id: item.id,
            product_name:
              item.product_name || "",
            quantity:
              number(item.quantity),
            created_at:
              item.created_at,
          }))
        );

        /* ====================================
           SET SALES
        ==================================== */

        setSales(
          (salesResult.data ||
            []).map((item) => ({
            id: item.id,
            product_name:
              item.product_name ||
              "",
            quantity:
              number(item.quantity),
            created_at:
              item.created_at,
          }))
        );

        /* ====================================
           SET MOVEMENTS
        ==================================== */

        setMovements(
          (movementsResult.data ||
            []).map((movement) => ({
            id: movement.id,
            inventory_id:
              movement.inventory_id,
            item_name:
              movement.item_name ||
              "",
            movement_type:
              movement.movement_type ||
              "",
            quantity:
              number(movement.quantity),
            reason:
              movement.reason ||
              null,
            created_by:
              movement.created_by ||
              null,
            created_at:
              movement.created_at,
          }))
        );
      } catch (err) {
        console.error(
          "Inventory loading error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load inventory."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  /* ========================================
     PRODUCTION BY PRODUCT
  ======================================== */

  const productionByProduct =
    useMemo(() => {
      const map =
        new Map<string, number>();

      production.forEach(
        (record) => {
          const key =
            record.product_name
              ?.trim()
              .toLowerCase();

          if (!key) return;

          const existing =
            map.get(key) || 0;

          map.set(
            key,
            existing +
              number(
                record.quantity
              )
          );
        }
      );

      return map;
    }, [production]);

  /* ========================================
     SALES BY PRODUCT
  ======================================== */

  const salesByProduct =
    useMemo(() => {
      const map =
        new Map<string, number>();

      sales.forEach(
        (sale) => {
          const key =
            sale.product_name
              ?.trim()
              .toLowerCase();

          if (!key) return;

          const existing =
            map.get(key) || 0;

          map.set(
            key,
            existing +
              number(
                sale.quantity
              )
          );
        }
      );

      return map;
    }, [sales]);

  /* ========================================
     INVENTORY RECONCILIATION
  ======================================== */

  const reconciled =
    useMemo(() => {
      return inventory.map(
        (item) => {
          const key =
            item.item_name
              ?.trim()
              .toLowerCase() ||
            "";

          const category =
            item.category
              ?.trim()
              .toLowerCase() ||
            "";

          const currentQuantity =
            number(item.quantity);

          /* ==================================
             FINISHED PRODUCTS

             PRODUCED
             - SOLD
          ================================== */

          if (
            category ===
              "finished product" ||
            category ===
              "finished goods" ||
            category ===
              "product"
          ) {
            const produced =
              productionByProduct.get(
                key
              ) || 0;

            const sold =
              salesByProduct.get(
                key
              ) || 0;

            const calculatedQuantity =
              produced - sold;

            const difference =
              currentQuantity -
              calculatedQuantity;

            return {
              item,
              produced,
              sold,
              calculatedQuantity,
              difference,
              status:
                Math.abs(
                  difference
                ) < 0.000001
                  ? "Balanced"
                  : "Difference",
            } satisfies Reconciliation;
          }

          /* ==================================
             RAW MATERIALS / UTILITIES

             OPENING STOCK
             + STOCK INCREASE
             - PRODUCTION CONSUMPTION
             - STOCK DECREASE
          ================================== */

          const itemMovements =
            movements.filter(
              (movement) =>
                movement.inventory_id ===
                item.id
            );

          let openingStock = 0;

          let stockIncrease = 0;

          let productionConsumption =
            0;

          let stockDecrease = 0;

          /* ==================================
             PROCESS MOVEMENTS
          ================================== */

          itemMovements.forEach(
            (movement) => {
              const quantity =
                number(
                  movement.quantity
                );

              const type =
                movement.movement_type
                  ?.trim()
                  .toLowerCase();

              switch (type) {
                case "opening_stock":
                  openingStock += quantity;
                  break;

                // Canonical database value is "IN"; normalize to lowercase above.
                case "in":
                case "increase":
                case "stock_in":
                case "purchase":
                case "purchase_received":
                case "adjustment_in":
                  stockIncrease += quantity;
                  break;

                case "production_consumption":
                  productionConsumption += quantity;
                  break;

                // Canonical database value is "OUT"; normalize to lowercase above.
                case "out":
                case "decrease":
                case "stock_out":
                case "adjustment_out":
                  stockDecrease += quantity;
                  break;

                default:
                  console.warn(
                    "Unknown inventory movement type:",
                    movement.movement_type,
                    "Movement ID:",
                    movement.id
                  );
              }
            }
          );

          /* ==================================
             CALCULATED STOCK
          ================================== */

          const calculatedQuantity =
            openingStock +
            stockIncrease -
            productionConsumption -
            stockDecrease;

          const difference =
            currentQuantity -
            calculatedQuantity;

          return {
            item,

            produced: 0,

            sold: 0,

            calculatedQuantity,

            difference,

            status:
              Math.abs(
                difference
              ) < 0.000001
                ? "Balanced"
                : "Difference",
          } satisfies Reconciliation;
        }
      );
    }, [
      inventory,
      movements,
      productionByProduct,
      salesByProduct,
    ]);

  /* ========================================
     FILTERED INVENTORY
  ======================================== */

  const filteredInventory =
    useMemo(() => {
      const searchTerm =
        search
          .trim()
          .toLowerCase();

      if (!searchTerm) {
        return reconciled;
      }

      return reconciled.filter(
        (record) => {
          return (
            record.item.item_name
              .toLowerCase()
              .includes(
                searchTerm
              ) ||
            record.item.category
              .toLowerCase()
              .includes(
                searchTerm
              )
          );
        }
      );
    }, [
      reconciled,
      search,
    ]);

  /* ========================================
     TOTAL INVENTORY ITEMS
  ======================================== */

  const inventoryCount =
    inventory.length;

  /* ========================================
     TOTAL QUANTITY
  ======================================== */

  const totalQuantity =
    inventory.reduce(
      (total, item) =>
        total +
        number(
          item.quantity
        ),
      0
    );

  /* ========================================
     INVENTORY VALUE
  ======================================== */

  const inventoryValue =
    inventory.reduce(
      (total, item) => {
        return (
          total +
          number(
            item.quantity
          ) *
            number(
              item.unit_cost
            )
        );
      },
      0
    );

  /* ========================================
     LOW STOCK

     CURRENT RULE:
     QUANTITY <= 20
  ======================================== */

  const lowStockCount =
    inventory.filter(
      (item) =>
        number(
          item.quantity
        ) <= 20
    ).length;

  /* ========================================
     BALANCED COUNT
  ======================================== */

  const balancedCount =
    reconciled.filter(
      (item) =>
        item.status ===
        "Balanced"
    ).length;

  /* ========================================
     DIFFERENCE COUNT
  ======================================== */

  const differenceCount =
    reconciled.filter(
      (item) =>
        item.status ===
        "Difference"
    ).length;

  /* ========================================
     LOADING
  ======================================== */

  if (loading) {
    return (
      <div className="p-6">
        Loading inventory...
      </div>
    );
  }
  /* ========================================
     ERROR
  ======================================== */

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">
          Inventory Error
        </h1>

        <p className="mt-2 text-red-600">
          {error}
        </p>
      </div>
    );
  }

  /* ========================================
     PAGE
  ======================================== */

  return (
    <div className="space-y-6 p-6">
      <RawMaterialsManager />

      {/* ================================
          PAGE HEADER
      ================================= */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-3xl font-bold">
            Inventory
          </h1>

          <p className="text-sm text-muted-foreground">
            Monitor raw materials,
            stock levels and inventory
            reconciliation.
          </p>
        </div>

        <div className="flex gap-3">

          <Link
            href="/inventory/history"
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium"
          >
            <History className="h-4 w-4" />

            Inventory History
          </Link>

          <Link
            href="/inventory/movements"
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium"
          >
            <ArrowUp className="h-4 w-4" />

            Stock Movements
          </Link>

        </div>
      </div>

      {/* ================================
          STATISTICS
      ================================= */}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">

        {/* INVENTORY ITEMS */}

        <div className="rounded-xl border bg-card p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <p className="text-sm text-muted-foreground">
              Inventory Items
            </p>

            <Package className="h-5 w-5 text-muted-foreground" />

          </div>

          <p className="mt-3 text-2xl font-bold">
            {inventoryCount}
          </p>

        </div>

        {/* TOTAL QUANTITY */}

        <div className="rounded-xl border bg-card p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <p className="text-sm text-muted-foreground">
              Total Quantity
            </p>

            <Warehouse className="h-5 w-5 text-muted-foreground" />

          </div>

          <p className="mt-3 text-2xl font-bold">
            {totalQuantity.toLocaleString(
              undefined,
              {
                maximumFractionDigits:
                  3,
              }
            )}
          </p>

        </div>

        {/* INVENTORY VALUE */}

        <div className="rounded-xl border bg-card p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <p className="text-sm text-muted-foreground">
              Inventory Value
            </p>

            <Scale className="h-5 w-5 text-muted-foreground" />

          </div>

          <p className="mt-3 text-xl font-bold">
            {formatCurrency(
              inventoryValue
            )}
          </p>

        </div>

        {/* LOW STOCK */}

        <div className="rounded-xl border bg-card p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <p className="text-sm text-muted-foreground">
              Low Stock
            </p>

            <AlertTriangle className="h-5 w-5 text-muted-foreground" />

          </div>

          <p className="mt-3 text-2xl font-bold">
            {lowStockCount}
          </p>

        </div>

        {/* BALANCED */}

        <div className="rounded-xl border bg-card p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <p className="text-sm text-muted-foreground">
              Balanced Items
            </p>

            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />

          </div>

          <p className="mt-3 text-2xl font-bold">
            {balancedCount}
          </p>

        </div>

        {/* DIFFERENCES */}

        <div className="rounded-xl border bg-card p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <p className="text-sm text-muted-foreground">
              Reconciliation Differences
            </p>

            <ArrowDown className="h-5 w-5 text-muted-foreground" />

          </div>

          <p className="mt-3 text-2xl font-bold">
            {differenceCount}
          </p>

        </div>

      </div>

      {/* ================================
          SEARCH
      ================================= */}

      <div className="relative">

        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

        <input
          type="text"
          placeholder="Search Inventory"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          className="w-full rounded-lg border py-2 pl-10 pr-4 outline-none"
        />

      </div>

      {/* ================================
          INVENTORY TABLE
      ================================= */}

      <div className="overflow-x-auto rounded-xl border">

        <table className="w-full text-sm">

          <thead className="border-b bg-muted/50">

            <tr>

              <th className="p-4 text-left">
                Product
              </th>

              <th className="p-4 text-left">
                Category
              </th>

              <th className="p-4 text-left">
                Unit
              </th>

              <th className="p-4 text-right">
                Current Stock
              </th>

              <th className="p-4 text-right">
                Produced
              </th>

              <th className="p-4 text-right">
                Sold
              </th>

              <th className="p-4 text-right">
                Ledger / Production Calc.
              </th>

              <th className="p-4 text-right">
                Difference
              </th>

              <th className="p-4 text-center">
                Status
              </th>

              <th className="p-4 text-right">
                Value
              </th>

            </tr>

          </thead>

          <tbody>

            {filteredInventory.map(
              (record) => {

                const item =
                  record.item;

                const value =
                  number(
                    item.quantity
                  ) *
                  number(
                    item.unit_cost
                  );

                return (
                  <tr
                    key={item.id}
                    className="border-b last:border-0"
                  >

                    <td className="p-4 font-medium">
                      {item.item_name}
                    </td>

                    <td className="p-4">
                      {item.category}
                    </td>

                    <td className="p-4">
                      {item.unit}
                    </td>

                    <td className="p-4 text-right">
                      {number(
                        item.quantity
                      ).toLocaleString(
                        undefined,
                        {
                          maximumFractionDigits:
                            3,
                        }
                      )}
                    </td>

                    <td className="p-4 text-right">

                      {record.produced ===
                      0
                        ? "0"
                        : record.produced.toLocaleString()}

                    </td>

                    <td className="p-4 text-right">

                      {record.sold ===
                      0
                        ? "0"
                        : record.sold.toLocaleString()}

                    </td>

                    <td className="p-4 text-right">

                      {record.calculatedQuantity.toLocaleString(
                        undefined,
                        {
                          maximumFractionDigits:
                            3,
                        }
                      )}

                    </td>

                    <td className="p-4 text-right">

                      {Math.abs(
                        record.difference
                      ) < 0.000001
                        ? "0"
                        : record.difference.toLocaleString(
                            undefined,
                            {
                              maximumFractionDigits:
                                3,
                            }
                          )}

                    </td>

                    <td className="p-4 text-center">

                      {record.status ===
                      "Balanced" ? (

                        <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                          Balanced
                        </span>

                      ) : (

                        <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                          Difference
                        </span>

                      )}

                    </td>

                    <td className="p-4 text-right font-medium">

                      {formatCurrency(
                        value
                      )}

                    </td>

                  </tr>
                );
              }
            )}

          </tbody>

        </table>

      </div>

      {/* ================================
          NO RESULTS
      ================================= */}

      {filteredInventory.length ===
        0 && (

        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          No inventory items found.
        </div>

      )}

      {/* ================================
          RECONCILIATION INFORMATION
      ================================= */}

      <div className="rounded-xl border bg-muted/30 p-5">

        <h2 className="font-semibold">
          Inventory Reconciliation
        </h2>

        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Current Stock:</strong>{" "}
            The quantity currently stored in the Supabase inventory table.
          </p>

          <p>
            <strong>Finished Products:</strong>{" "}
            Calculated as recorded production quantity minus recorded sales quantity.
          </p>

          <p>
            <strong>Raw Materials:</strong>{" "}
            Opening stock + stock increases (including IN and adjustment_in) −
            production consumption − stock decreases (including OUT and adjustment_out).
          </p>

          <p>
            <strong>Ledger / Production Calc.:</strong>{" "}
            A calculation from the movement, production, and sales records loaded by this page.
            It is not a physical stock count and may differ from current stock if historical
            transactions or opening balances are incomplete or inconsistent.
          </p>

          <p>
            <strong>Difference:</strong>{" "}
            Current Stock − Ledger / Production Calc. A non-zero result should be investigated;
            it does not automatically mean the current physical stock is wrong.
          </p>
        </div>

      </div>

    </div>
  );
}
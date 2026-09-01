"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  History,
  Loader2,
  Package,
  Plus,
} from "lucide-react";

import { supabase } from "@/lib/supabase/client";

interface InventoryItem {
  id: string;
  item_name: string;
  category: string | null;
  unit: string | null;
  quantity: number | string | null;
}

interface InventoryMovement {
  id: string;
  inventory_id: string;
  item_name: string;
  movement_type: string;
  quantity: number | string;
  reason: string | null;
  created_at: string;
}

function number(value: unknown): number {
  const result = Number(value);

  return Number.isFinite(result) ? result : 0;
}

function formatMovementType(type: string): string {
  const movementTypes: Record<string, string> = {
    opening_stock: "Opening Stock",
    increase: "Stock Increase",
    purchase: "Purchase",
    production_consumption: "Production Consumption",
    decrease: "Stock Decrease",
    adjustment_in: "Stock Adjustment In",
    adjustment_out: "Stock Adjustment Out",
    sale: "Sale",
    transfer_in: "Transfer In",
    transfer_out: "Transfer Out",
  };

  return (
    movementTypes[type] ||
    type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function isStockOutMovement(type: string): boolean {
  return [
    "production_consumption",
    "decrease",
    "adjustment_out",
    "sale",
    "transfer_out",
  ].includes(type);
}

function isStockInMovement(type: string): boolean {
  return [
    "opening_stock",
    "increase",
    "purchase",
    "adjustment_in",
    "transfer_in",
  ].includes(type);
}

function formatDate(dateString: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

export default function InventoryMovementsPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [inventoryId, setInventoryId] = useState("");
  const [movementType, setMovementType] = useState("increase");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [inventoryResult, movementsResult] = await Promise.all([
        supabase
          .from("inventory")
          .select("*")
          .order("item_name", { ascending: true }),

        supabase
          .from("inventory_movements")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (inventoryResult.error) {
        throw inventoryResult.error;
      }

      if (movementsResult.error) {
        throw movementsResult.error;
      }

      setInventory(inventoryResult.data || []);
      setMovements(movementsResult.data || []);
    } catch (err) {
      console.error("Failed to load inventory movements:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load inventory movements."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedInventoryItem = useMemo(() => {
    return inventory.find((item) => item.id === inventoryId);
  }, [inventory, inventoryId]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    if (!inventoryId) {
      setError("Please select an inventory item.");
      return;
    }

    const movementQuantity = number(quantity);

    if (movementQuantity <= 0) {
      setError("Please enter a quantity greater than zero.");
      return;
    }

    if (!selectedInventoryItem) {
      setError("Selected inventory item was not found.");
      return;
    }

    try {
      setSaving(true);

      const currentQuantity = number(
        selectedInventoryItem.quantity
      );

      const stockOut = isStockOutMovement(
        movementType
      );

      const newQuantity = stockOut
        ? currentQuantity - movementQuantity
        : currentQuantity + movementQuantity;

      if (newQuantity < 0) {
        setError(
          `Insufficient stock. Current stock is ${currentQuantity} ${
            selectedInventoryItem.unit || ""
          }.`
        );

        return;
      }

      const { error: movementError } =
        await supabase
          .from("inventory_movements")
          .insert({
            inventory_id: inventoryId,
            item_name: selectedInventoryItem.item_name,
            movement_type: movementType,
            quantity: movementQuantity,
            reason:
              reason.trim() ||
              formatMovementType(movementType),
          });

      if (movementError) {
        throw movementError;
      }

      const { error: inventoryError } =
        await supabase
          .from("inventory")
          .update({
            quantity: newQuantity,
          })
          .eq("id", inventoryId);

      if (inventoryError) {
        throw inventoryError;
      }

      setSuccess(
        `${selectedInventoryItem.item_name} stock updated successfully.`
      );

      setInventoryId("");
      setMovementType("increase");
      setQuantity("");
      setReason("");

      await loadData();
    } catch (err) {
      console.error(
        "Failed to record inventory movement:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to record inventory movement."
      );
    } finally {
      setSaving(false);
    }
  }

  const totalStockIn = useMemo(() => {
    return movements
      .filter((movement) =>
        isStockInMovement(movement.movement_type)
      )
      .reduce(
        (total, movement) =>
          total + number(movement.quantity),
        0
      );
  }, [movements]);

  const totalStockOut = useMemo(() => {
    return movements
      .filter((movement) =>
        isStockOutMovement(movement.movement_type)
      )
      .reduce(
        (total, movement) =>
          total + number(movement.quantity),
        0
      );
  }, [movements]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading inventory movements...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-8">
      {/* PAGE HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2">
            <Link
              href="/inventory"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Inventory
            </Link>
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Stock Movements
          </h1>

          <p className="mt-2 text-muted-foreground">
            Record and audit inventory movements.
          </p>
        </div>

        <Link
          href="/inventory/history"
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <History className="h-4 w-4" />
          Inventory History
        </Link>
      </div>

      {/* SUMMARY CARDS */}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Total Movements
              </p>

              <p className="mt-2 text-3xl font-bold">
                {movements.length}
              </p>
            </div>

            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Stock In
              </p>

              <p className="mt-2 text-3xl font-bold">
                {totalStockIn.toLocaleString()}
              </p>
            </div>

            <ArrowUp className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Stock Out
              </p>

              <p className="mt-2 text-3xl font-bold">
                {totalStockOut.toLocaleString()}
              </p>
            </div>

            <ArrowDown className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* RECORD MOVEMENT FORM */}

      <div className="rounded-xl border bg-card">
        <div className="border-b p-6">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5" />

            <div>
              <h2 className="text-xl font-semibold">
                Record Stock Movement
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Add stock increases or record stock reductions.
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-6"
        >
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm">
              {success}
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            {/* INVENTORY ITEM */}

            <div className="space-y-2">
              <label
                htmlFor="inventory-item"
                className="text-sm font-medium"
              >
                Inventory Item
              </label>

              <select
                id="inventory-item"
                value={inventoryId}
                onChange={(event) =>
                  setInventoryId(event.target.value)
                }
                className="w-full rounded-lg border bg-background px-3 py-2"
              >
                <option value="">
                  Select inventory item
                </option>

                {inventory.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.item_name} — Current:{" "}
                    {number(
                      item.quantity
                    ).toLocaleString()}{" "}
                    {item.unit || ""}
                  </option>
                ))}
              </select>
            </div>

            {/* MOVEMENT TYPE */}

            <div className="space-y-2">
              <label
                htmlFor="movement-type"
                className="text-sm font-medium"
              >
                Movement Type
              </label>

              <select
                id="movement-type"
                value={movementType}
                onChange={(event) =>
                  setMovementType(event.target.value)
                }
                className="w-full rounded-lg border bg-background px-3 py-2"
              >
                <option value="increase">
                  Stock Increase
                </option>

                <option value="purchase">
                  Purchase
                </option>

                <option value="decrease">
                  Stock Decrease
                </option>

                <option value="adjustment_in">
                  Stock Adjustment In
                </option>

                <option value="adjustment_out">
                  Stock Adjustment Out
                </option>
              </select>
            </div>

            {/* QUANTITY */}

            <div className="space-y-2">
              <label
                htmlFor="quantity"
                className="text-sm font-medium"
              >
                Quantity
              </label>

              <input
                id="quantity"
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={(event) =>
                  setQuantity(event.target.value)
                }
                placeholder="Enter quantity"
                className="w-full rounded-lg border bg-background px-3 py-2"
              />
            </div>

            {/* REASON */}

            <div className="space-y-2">
              <label
                htmlFor="reason"
                className="text-sm font-medium"
              >
                Reason
              </label>

              <input
                id="reason"
                type="text"
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value)
                }
                placeholder="Optional reason"
                className="w-full rounded-lg border bg-background px-3 py-2"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Record Movement
              </>
            )}
          </button>
        </form>
      </div>

      {/* MOVEMENT HISTORY */}

      <div className="rounded-xl border bg-card">
        <div className="border-b p-6">
          <h2 className="text-xl font-semibold">
            Movement History
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Every inventory movement is recorded here.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-6 py-4 text-left font-medium">
                  Date
                </th>

                <th className="px-6 py-4 text-left font-medium">
                  Item
                </th>

                <th className="px-6 py-4 text-left font-medium">
                  Movement
                </th>

                <th className="px-6 py-4 text-right font-medium">
                  Quantity
                </th>

                <th className="px-6 py-4 text-left font-medium">
                  Reason
                </th>
              </tr>
            </thead>

            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-muted-foreground"
                  >
                    No inventory movements recorded yet.
                  </td>
                </tr>
              ) : (
                movements.map((movement) => {
                  const stockOut =
                    isStockOutMovement(
                      movement.movement_type
                    );

                  const movementQuantity =
                    number(movement.quantity);

                  const inventoryItem =
                    inventory.find(
                      (item) =>
                        item.id ===
                        movement.inventory_id
                    );

                  const unit =
                    inventoryItem?.unit || "";

                  return (
                    <tr
                      key={movement.id}
                      className="border-b last:border-b-0 hover:bg-muted/30"
                    >
                      {/* DATE */}

                      <td className="whitespace-nowrap px-6 py-4">
                        {formatDate(
                          movement.created_at
                        )}
                      </td>

                      {/* ITEM */}

                      <td className="px-6 py-4 font-medium">
                        {movement.item_name}
                      </td>

                      {/* MOVEMENT TYPE */}

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            stockOut
                              ? "bg-red-500/10 text-red-700 dark:text-red-400"
                              : "bg-green-500/10 text-green-700 dark:text-green-400"
                          }`}
                        >
                          {formatMovementType(
                            movement.movement_type
                          )}
                        </span>
                      </td>

                      {/* QUANTITY */}

                      <td className="whitespace-nowrap px-6 py-4 text-right font-semibold">
                        <span
                          className={
                            stockOut
                              ? "text-red-600 dark:text-red-400"
                              : "text-green-600 dark:text-green-400"
                          }
                        >
                          {stockOut ? "-" : "+"}
                          {movementQuantity.toLocaleString()}{" "}
                          {unit}
                        </span>
                      </td>

                      {/* REASON */}

                      <td className="px-6 py-4 text-muted-foreground">
                        {movement.reason || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* IMPORTANT NOTE */}

      <div className="rounded-xl border bg-muted/30 p-6 text-sm text-muted-foreground">
        <strong className="text-foreground">
          Inventory movement rules:
        </strong>

        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>
            Opening stock, purchases and stock increases
            add inventory.
          </li>

          <li>
            Production consumption, decreases and stock
            adjustments out reduce inventory.
          </li>

          <li>
            Production consumption is automatically recorded
            when blocks are produced.
          </li>

          <li>
            Manual movements should not duplicate production
            consumption records.
          </li>
        </ul>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import {
  getInventory,
} from "@/services/inventory";
import {
  getInventoryMovements,
  recordInventoryMovement,
} from "@/services/inventory-movements";
import type { InventoryItem } from "@/types/inventory";
import type {
  InventoryMovement,
  InventoryMovementType,
} from "@/types/inventory-movement";

const movementTypes: {
  value: InventoryMovementType;
  label: string;
  direction: "in" | "out";
}[] = [
  {
    value: "opening_stock",
    label: "Opening Stock",
    direction: "in",
  },
  {
    value: "increase",
    label: "Stock Increase",
    direction: "in",
  },
  {
    value: "decrease",
    label: "Stock Decrease",
    direction: "out",
  },
  {
    value: "damaged",
    label: "Damaged Blocks",
    direction: "out",
  },
  {
    value: "broken",
    label: "Broken Blocks",
    direction: "out",
  },
  {
    value: "wastage",
    label: "Wastage",
    direction: "out",
  },
  {
    value: "correction",
    label: "Correction",
    direction: "in",
  },
  {
    value: "other",
    label: "Other",
    direction: "in",
  },
];

function movementLabel(
  type: InventoryMovementType
) {
  return (
    movementTypes.find(
      (item) => item.value === type
    )?.label || type
  );
}

function movementDirection(
  type: InventoryMovementType
) {
  const item = movementTypes.find(
    (entry) => entry.value === type
  );

  return item?.direction || "in";
}

export default function InventoryMovementsPage() {
  const [inventory, setInventory] =
    useState<InventoryItem[]>([]);

  const [movements, setMovements] =
    useState<InventoryMovement[]>([]);

  const [inventoryId, setInventoryId] =
    useState("");

  const [movementType, setMovementType] =
    useState<InventoryMovementType>(
      "increase"
    );

  const [quantity, setQuantity] =
    useState("");

  const [reason, setReason] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  async function loadData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const [
        inventoryResult,
        movementsResult,
      ] = await Promise.all([
        getInventory(),
        getInventoryMovements(),
      ]);

      if (inventoryResult.error) {
        throw new Error(
          inventoryResult.error.message
        );
      }

      if (movementsResult.error) {
        throw new Error(
          movementsResult.error.message
        );
      }

      setInventory(
        (inventoryResult.data ||
          []) as InventoryItem[]
      );

      setMovements(
        (movementsResult.data ||
          []) as InventoryMovement[]
      );
    } catch (error) {
      console.error(
        "Inventory movements error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load inventory movements."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function submitMovement(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const parsedQuantity =
      Number(quantity);

    if (!inventoryId) {
      setErrorMessage(
        "Please select an inventory item."
      );
      setSaving(false);
      return;
    }

    if (
      !Number.isFinite(
        parsedQuantity
      ) ||
      parsedQuantity <= 0
    ) {
      setErrorMessage(
        "Quantity must be greater than zero."
      );
      setSaving(false);
      return;
    }

    try {
      const result =
        await recordInventoryMovement({
          inventory_id: inventoryId,
          movement_type: movementType,
          quantity: parsedQuantity,
          reason,
        });

      if (result.error) {
        throw result.error;
      }

      setMessage(
        "Inventory movement recorded successfully."
      );

      setQuantity("");
      setReason("");

      await loadData();
    } catch (error) {
      console.error(
        "Save inventory movement error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to record inventory movement."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-8 p-6">

      <div>
        <h1 className="text-3xl font-bold">
          Stock Movements
        </h1>

        <p className="mt-1 text-gray-600">
          Record and audit manual inventory
          adjustments.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="rounded-lg border bg-white p-6 shadow-sm">

        <h2 className="mb-5 text-xl font-bold">
          Record Stock Movement
        </h2>

        <form
          onSubmit={submitMovement}
          className="grid gap-5 md:grid-cols-2"
        >

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Inventory Item
            </label>

            <select
              value={inventoryId}
              onChange={(event) =>
                setInventoryId(
                  event.target.value
                )
              }
              className="w-full rounded-lg border px-3 py-2"
              required
            >
              <option value="">
                Select inventory item
              </option>

              {inventory.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.item_name} — Current:
                  {" "}
                  {Number(
                    item.quantity
                  ).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Movement Type
            </label>

            <select
              value={movementType}
              onChange={(event) =>
                setMovementType(
                  event.target
                    .value as InventoryMovementType
                )
              }
              className="w-full rounded-lg border px-3 py-2"
            >
              {movementTypes.map(
                (type) => (
                  <option
                    key={type.value}
                    value={type.value}
                  >
                    {type.label}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Quantity
            </label>

            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(event) =>
                setQuantity(
                  event.target.value
                )
              }
              className="w-full rounded-lg border px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Reason
            </label>

            <input
              type="text"
              value={reason}
              onChange={(event) =>
                setReason(
                  event.target.value
                )
              }
              placeholder="e.g. Broken blocks during loading"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div className="md:col-span-2">

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-black px-5 py-2.5 font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {saving
                ? "Recording..."
                : "Record Movement"}
            </button>

          </div>

        </form>

      </section>

      <section className="rounded-lg border bg-white shadow-sm">

        <div className="border-b p-5">

          <h2 className="text-xl font-bold">
            Movement History
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Every manual inventory movement
            is recorded here.
          </p>

        </div>

        {loading ? (

          <div className="p-10 text-center">
            Loading movements...
          </div>

        ) : movements.length ===
          0 ? (

          <div className="p-10 text-center text-gray-500">
            No inventory movements have
            been recorded.
          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="min-w-full">

              <thead className="bg-gray-50">

                <tr>

                  <th className="border-b p-3 text-left text-sm font-semibold">
                    Date
                  </th>

                  <th className="border-b p-3 text-left text-sm font-semibold">
                    Product
                  </th>

                  <th className="border-b p-3 text-left text-sm font-semibold">
                    Movement
                  </th>

                  <th className="border-b p-3 text-right text-sm font-semibold">
                    Quantity
                  </th>

                  <th className="border-b p-3 text-left text-sm font-semibold">
                    Reason
                  </th>

                </tr>

              </thead>

              <tbody>

                {movements.map(
                  (movement) => {
                    const direction =
                      movementDirection(
                        movement.movement_type
                      );

                    return (
                      <tr
                        key={
                          movement.id
                        }
                        className="border-b last:border-b-0"
                      >

                        <td className="whitespace-nowrap p-3">
                          {new Date(
                            movement.created_at
                          ).toLocaleString(
                            "en-GH"
                          )}
                        </td>

                        <td className="p-3 font-semibold">
                          {
                            movement.item_name
                          }
                        </td>

                        <td className="p-3">
                          {movementLabel(
                            movement.movement_type
                          )}
                        </td>

                        <td
                          className={`p-3 text-right font-semibold ${
                            direction ===
                            "in"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {direction ===
                          "in"
                            ? "+"
                            : "-"}
                          {Number(
                            movement.quantity
                          ).toLocaleString()}
                        </td>

                        <td className="p-3">
                          {movement.reason ||
                            "—"}
                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </main>
  );
}
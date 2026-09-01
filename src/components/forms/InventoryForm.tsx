"use client";

import { useState } from "react";
import { createInventoryItem } from "@/services/inventory";

const CATEGORIES = [
  "Raw Material",
  "Building Material",
  "Finished Product",
  "Utility",
  "Power",
  "Fuel",
  "Other",
];

const UNITS = [
  "Bag",
  "Cubic metre",
  "Litre",
  "Piece",
  "Kwh",
  "Ton",
  "Other",
];

export default function InventoryForm() {
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!itemName.trim()) {
      alert("Please enter the item name.");
      return;
    }

    if (!category) {
      alert("Please select a category.");
      return;
    }

    if (!unit) {
      alert("Please select a unit.");
      return;
    }

    const quantityNumber = Number(quantity);
    const unitCostNumber = Number(unitCost);

    if (
      !Number.isFinite(quantityNumber) ||
      quantityNumber < 0
    ) {
      alert("Please enter a valid quantity.");
      return;
    }

    if (
      !Number.isFinite(unitCostNumber) ||
      unitCostNumber < 0
    ) {
      alert("Please enter a valid unit cost.");
      return;
    }

    setSaving(true);

    try {
      const { error } =
        await createInventoryItem({
          item_name: itemName.trim(),
          category,
          unit,
          quantity: quantityNumber,
          unit_cost: unitCostNumber,
        });

      if (error) {
        console.error(
          "Inventory error:",
          error
        );

        alert(error.message);
        return;
      }

      alert(
        "Inventory item added successfully."
      );

      setItemName("");
      setCategory("");
      setUnit("");
      setQuantity("");
      setUnitCost("");
    } catch (error) {
      console.error(
        "Unexpected inventory error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to add inventory item."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-lg bg-white p-6 shadow"
    >
      <div>
        <label
          htmlFor="item-name"
          className="mb-2 block font-medium"
        >
          Item Name
        </label>

        <input
          id="item-name"
          type="text"
          value={itemName}
          onChange={(e) =>
            setItemName(e.target.value)
          }
          className="w-full rounded border p-3"
          placeholder="Example: Cement"
          required
        />
      </div>

      <div>
        <label
          htmlFor="category"
          className="mb-2 block font-medium"
        >
          Category
        </label>

        <select
          id="category"
          value={category}
          onChange={(e) =>
            setCategory(e.target.value)
          }
          className="w-full rounded border p-3"
          required
        >
          <option value="">
            Select category
          </option>

          {CATEGORIES.map((value) => (
            <option
              key={value}
              value={value}
            >
              {value}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="unit"
          className="mb-2 block font-medium"
        >
          Unit
        </label>

        <select
          id="unit"
          value={unit}
          onChange={(e) =>
            setUnit(e.target.value)
          }
          className="w-full rounded border p-3"
          required
        >
          <option value="">
            Select unit
          </option>

          {UNITS.map((value) => (
            <option
              key={value}
              value={value}
            >
              {value}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="quantity"
          className="mb-2 block font-medium"
        >
          Opening Quantity
        </label>

        <input
          id="quantity"
          type="number"
          min="0"
          step="0.01"
          value={quantity}
          onChange={(e) =>
            setQuantity(e.target.value)
          }
          className="w-full rounded border p-3"
          placeholder="Example: 50"
          required
        />
      </div>

      <div>
        <label
          htmlFor="unit-cost"
          className="mb-2 block font-medium"
        >
          Unit Cost (GH₵)
        </label>

        <input
          id="unit-cost"
          type="number"
          min="0"
          step="0.01"
          value={unitCost}
          onChange={(e) =>
            setUnitCost(e.target.value)
          }
          className="w-full rounded border p-3"
          placeholder="Example: 75"
          required
        />
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <p className="font-semibold">
          Opening Stock
        </p>

        <p className="mt-1">
          The quantity entered here will be
          treated as the opening stock for this
          inventory item.
        </p>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving
          ? "Saving..."
          : "Add Opening Inventory"}
      </button>
    </form>
  );
}
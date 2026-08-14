"use client";

import { useState } from "react";
import { createInventoryItem } from "@/services/inventory";

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

    if (!category.trim()) {
      alert("Please enter the category.");
      return;
    }

    if (!unit.trim()) {
      alert("Please enter the unit.");
      return;
    }

    const quantityNumber = Number(quantity);
    const unitCostNumber = Number(unitCost);

    if (
      !quantity ||
      quantityNumber < 0
    ) {
      alert("Please enter a valid quantity.");
      return;
    }

    if (
      !unitCost ||
      unitCostNumber < 0
    ) {
      alert("Please enter a valid unit cost.");
      return;
    }

    setSaving(true);

    const { error } =
      await createInventoryItem({
        item_name: itemName.trim(),
        category: category.trim(),
        unit: unit.trim(),
        quantity: quantityNumber,
        unit_cost: unitCostNumber,
      });

    if (error) {
      console.error(
        "Inventory error:",
        error
      );

      alert(error.message);
      setSaving(false);
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

    setSaving(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-lg bg-white p-6 shadow"
    >
      <div>
        <label className="mb-2 block font-medium">
          Item Name
        </label>

        <input
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
        <label className="mb-2 block font-medium">
          Category
        </label>

        <input
          type="text"
          value={category}
          onChange={(e) =>
            setCategory(e.target.value)
          }
          className="w-full rounded border p-3"
          placeholder="Example: Building Material"
          required
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Unit
        </label>

        <input
          type="text"
          value={unit}
          onChange={(e) =>
            setUnit(e.target.value)
          }
          className="w-full rounded border p-3"
          placeholder="Example: Bag, Litre, Piece"
          required
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Quantity
        </label>

        <input
          type="number"
          min="0"
          step="0.01"
          value={quantity}
          onChange={(e) =>
            setQuantity(e.target.value)
          }
          className="w-full rounded border p-3"
          placeholder="Enter quantity"
          required
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Unit Cost (GH₵)
        </label>

        <input
          type="number"
          min="0"
          step="0.01"
          value={unitCost}
          onChange={(e) =>
            setUnitCost(e.target.value)
          }
          className="w-full rounded border p-3"
          placeholder="Enter unit cost"
          required
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving
          ? "Saving..."
          : "Save Inventory Item"}
      </button>
    </form>
  );
}
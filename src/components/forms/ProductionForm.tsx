"use client";

import { useState } from "react";
import { createProduction } from "@/services/production";

export default function ProductionForm() {
  const [productName, setProductName] =
    useState("");

  const [quantity, setQuantity] =
    useState("");

  const [cementUsed, setCementUsed] =
    useState("");

  const [sandUsed, setSandUsed] =
    useState("");

  const [quarryDustUsed, setQuarryDustUsed] =
    useState("");

  const [waterUsed, setWaterUsed] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!productName.trim()) {
      alert("Please enter the product name.");
      return;
    }

    const quantityNumber = Number(quantity);
    const cementNumber = Number(cementUsed);
    const sandNumber = Number(sandUsed);
    const quarryDustNumber =
      Number(quarryDustUsed);
    const waterNumber = Number(waterUsed);

    if (
      !quantity ||
      quantityNumber <= 0
    ) {
      alert(
        "Please enter a valid production quantity."
      );
      return;
    }

    if (
      !cementUsed ||
      cementNumber < 0
    ) {
      alert(
        "Please enter a valid cement quantity."
      );
      return;
    }

    if (
      !sandUsed ||
      sandNumber < 0
    ) {
      alert(
        "Please enter a valid sand quantity."
      );
      return;
    }

    if (
      !quarryDustUsed ||
      quarryDustNumber < 0
    ) {
      alert(
        "Please enter a valid quarry dust quantity."
      );
      return;
    }

    if (
      !waterUsed ||
      waterNumber < 0
    ) {
      alert(
        "Please enter a valid water quantity."
      );
      return;
    }

    setSaving(true);

    const { error } =
      await createProduction({
        product_name:
          productName.trim(),
        quantity: quantityNumber,
        cement_used: cementNumber,
        sand_used: sandNumber,
        quarry_dust_used:
          quarryDustNumber,
        water_used: waterNumber,
      });

    if (error) {
      console.error(
        "Production error:",
        error
      );

      alert(error.message);
      setSaving(false);
      return;
    }

    alert(
      "Production saved successfully."
    );

    setProductName("");
    setQuantity("");
    setCementUsed("");
    setSandUsed("");
    setQuarryDustUsed("");
    setWaterUsed("");

    setSaving(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-lg bg-white p-6 shadow"
    >
      <div>
        <label className="mb-2 block font-medium">
          Product Name
        </label>

        <input
          type="text"
          value={productName}
          onChange={(e) =>
            setProductName(e.target.value)
          }
          className="w-full rounded border p-3"
          placeholder="Example: 5-inch hollow block"
          required
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Quantity Produced
        </label>

        <input
          type="number"
          min="1"
          step="1"
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
          Cement Used
        </label>

        <input
          type="number"
          min="0"
          step="0.01"
          value={cementUsed}
          onChange={(e) =>
            setCementUsed(e.target.value)
          }
          className="w-full rounded border p-3"
          placeholder="Enter cement used"
          required
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Sand Used
        </label>

        <input
          type="number"
          min="0"
          step="0.01"
          value={sandUsed}
          onChange={(e) =>
            setSandUsed(e.target.value)
          }
          className="w-full rounded border p-3"
          placeholder="Enter sand used"
          required
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Quarry Dust Used
        </label>

        <input
          type="number"
          min="0"
          step="0.01"
          value={quarryDustUsed}
          onChange={(e) =>
            setQuarryDustUsed(e.target.value)
          }
          className="w-full rounded border p-3"
          placeholder="Enter quarry dust used"
          required
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Water Used
        </label>

        <input
          type="number"
          min="0"
          step="0.01"
          value={waterUsed}
          onChange={(e) =>
            setWaterUsed(e.target.value)
          }
          className="w-full rounded border p-3"
          placeholder="Enter water used"
          required
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving
          ? "Saving Production..."
          : "Save Production"}
      </button>
    </form>
  );
}
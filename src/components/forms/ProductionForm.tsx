"use client";

import { useState } from "react";
import { createProduction } from "@/services/production";

const PRODUCTS = [
  "5-inch Solid Block",
  "6-inch Solid Block",
  "5-inch Hollow Block",
  "6-inch Hollow Block",
];

export default function ProductionForm() {
  const [productName, setProductName] =
    useState("");

  const [quantity, setQuantity] =
    useState("");

  const [cementUsed, setCementUsed] =
    useState("");

  const [chippingsUsed, setChippingsUsed] =
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
      alert("Please select a product.");
      return;
    }

    const quantityNumber =
      Number(quantity);

    const cementNumber =
      Number(cementUsed);

    const chippingsNumber =
      Number(chippingsUsed);

    const quarryDustNumber =
      Number(quarryDustUsed);

    const waterNumber =
      Number(waterUsed);

    if (
      !Number.isInteger(quantityNumber) ||
      quantityNumber <= 0
    ) {
      alert(
        "Please enter a valid production quantity."
      );
      return;
    }

    if (
      !Number.isFinite(cementNumber) ||
      cementNumber < 0
    ) {
      alert(
        "Please enter a valid cement quantity."
      );
      return;
    }

    if (
      !Number.isFinite(chippingsNumber) ||
      chippingsNumber < 0
    ) {
      alert(
        "Please enter a valid chippings quantity."
      );
      return;
    }

    if (
      !Number.isFinite(quarryDustNumber) ||
      quarryDustNumber < 0
    ) {
      alert(
        "Please enter a valid quarry dust quantity."
      );
      return;
    }

    if (
      !Number.isFinite(waterNumber) ||
      waterNumber < 0
    ) {
      alert(
        "Please enter a valid water quantity."
      );
      return;
    }

    setSaving(true);

    try {
      const { error } =
        await createProduction({
          product_name:
            productName.trim(),

          quantity:
            quantityNumber,

          cement_used:
            cementNumber,

          chippings_used:
            chippingsNumber,

          quarry_dust_used:
            quarryDustNumber,

          water_used:
            waterNumber,
        });

      if (error) {
        console.error(
          "Production error:",
          error
        );

        alert(error.message);
        return;
      }

      alert(
        "Production saved successfully."
      );

      setProductName("");
      setQuantity("");
      setCementUsed("");
      setChippingsUsed("");
      setQuarryDustUsed("");
      setWaterUsed("");
    } catch (error) {
      console.error(
        "Production error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Unable to save production."
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
      {/* Product */}
      <div>
        <label
          htmlFor="productName"
          className="mb-2 block font-medium"
        >
          Product Name
        </label>

        <select
          id="productName"
          value={productName}
          onChange={(e) =>
            setProductName(e.target.value)
          }
          className="w-full rounded border p-3"
          disabled={saving}
          required
        >
          <option value="">
            Select product
          </option>

          {PRODUCTS.map((product) => (
            <option
              key={product}
              value={product}
            >
              {product}
            </option>
          ))}
        </select>
      </div>

      {/* Quantity */}
      <div>
        <label
          htmlFor="quantity"
          className="mb-2 block font-medium"
        >
          Quantity Produced
        </label>

        <input
          id="quantity"
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(e) =>
            setQuantity(e.target.value)
          }
          className="w-full rounded border p-3"
          placeholder="Enter quantity"
          disabled={saving}
          required
        />
      </div>

      {/* Cement */}
      <div>
        <label
          htmlFor="cementUsed"
          className="mb-2 block font-medium"
        >
          Cement Used
        </label>

        <div className="relative">
          <input
            id="cementUsed"
            type="number"
            min="0"
            step="0.01"
            value={cementUsed}
            onChange={(e) =>
              setCementUsed(
                e.target.value
              )
            }
            className="w-full rounded border p-3 pr-16"
            placeholder="Enter cement used"
            disabled={saving}
            required
          />

          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
            bags
          </span>
        </div>

        <p className="mt-1 text-xs text-gray-500">
          GH₵75 per bag
        </p>
      </div>

      {/* Chippings */}
      <div>
        <label
          htmlFor="chippingsUsed"
          className="mb-2 block font-medium"
        >
          Chippings Used
        </label>

        <div className="relative">
          <input
            id="chippingsUsed"
            type="number"
            min="0"
            step="0.01"
            value={chippingsUsed}
            onChange={(e) =>
              setChippingsUsed(
                e.target.value
              )
            }
            className="w-full rounded border p-3 pr-16"
            placeholder="Enter chippings used"
            disabled={saving}
            required
          />

          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
            m³
          </span>
        </div>

        <p className="mt-1 text-xs text-gray-500">
          GH₵235 per m³
        </p>
      </div>

      {/* Quarry Dust */}
      <div>
        <label
          htmlFor="quarryDustUsed"
          className="mb-2 block font-medium"
        >
          Quarry Dust Used
        </label>

        <div className="relative">
          <input
            id="quarryDustUsed"
            type="number"
            min="0"
            step="0.01"
            value={quarryDustUsed}
            onChange={(e) =>
              setQuarryDustUsed(
                e.target.value
              )
            }
            className="w-full rounded border p-3 pr-16"
            placeholder="Enter quarry dust used"
            disabled={saving}
            required
          />

          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
            m³
          </span>
        </div>

        <p className="mt-1 text-xs text-gray-500">
          GH₵235 per m³
        </p>
      </div>

      {/* Water */}
      <div>
        <label
          htmlFor="waterUsed"
          className="mb-2 block font-medium"
        >
          Water Used
        </label>

        <div className="relative">
          <input
            id="waterUsed"
            type="number"
            min="0"
            step="0.01"
            value={waterUsed}
            onChange={(e) =>
              setWaterUsed(
                e.target.value
              )
            }
            className="w-full rounded border p-3 pr-16"
            placeholder="Enter water used"
            disabled={saving}
            required
          />

          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
            L
          </span>
        </div>

        <p className="mt-1 text-xs text-gray-500">
          GH₵0.50 per litre
        </p>
      </div>

      {/* Submit */}
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
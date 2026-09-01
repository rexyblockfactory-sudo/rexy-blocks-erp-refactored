"use client";

import { useMemo, useState } from "react";
import { createProduction } from "@/services/production";

type Recipe = {
  targetYield: number;
  cementPerBag: number;
  quarryDustWheelbarrows: number;
  chippingsWheelbarrows: number;
  waterMin: number;
  waterMax: number;
};

const WHEELBARROW_LITRES = 90;
const LITRES_PER_M3 = 1000;

const WHEELBARROW_TO_M3 =
  WHEELBARROW_LITRES / LITRES_PER_M3;

const RECIPES: Record<string, Recipe> = {
  "5-inch Solid Block": {
    targetYield: 60,
    cementPerBag: 1,
    quarryDustWheelbarrows: 6,
    chippingsWheelbarrows: 2,
    waterMin: 25,
    waterMax: 30,
  },

  "5-inch Hollow Block": {
    targetYield: 65,
    cementPerBag: 1,
    quarryDustWheelbarrows: 6,
    chippingsWheelbarrows: 2,
    waterMin: 25,
    waterMax: 30,
  },

  "6-inch Solid Block": {
    targetYield: 45,
    cementPerBag: 1,
    quarryDustWheelbarrows: 6,
    chippingsWheelbarrows: 2,
    waterMin: 25,
    waterMax: 30,
  },

  "6-inch Hollow Block": {
    targetYield: 55,
    cementPerBag: 1,
    quarryDustWheelbarrows: 6,
    chippingsWheelbarrows: 2,
    waterMin: 25,
    waterMax: 30,
  },
};

const PRODUCTS = Object.keys(RECIPES);

const CEMENT_COST = 75;

export default function ProductionForm() {
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [cementUsed, setCementUsed] = useState("");
  const [waterUsed, setWaterUsed] = useState("");
  const [saving, setSaving] = useState(false);

  const recipe = useMemo(
    () => RECIPES[productName],
    [productName]
  );

  const quantityNumber = Number(quantity);

  const standardBags =
    recipe &&
    Number.isFinite(quantityNumber) &&
    quantityNumber > 0
      ? quantityNumber / recipe.targetYield
      : 0;

  const standardQuarryDustWheelbarrows =
    recipe
      ? standardBags *
        recipe.quarryDustWheelbarrows
      : 0;

  const standardChippingsWheelbarrows =
    recipe
      ? standardBags *
        recipe.chippingsWheelbarrows
      : 0;

  const standardQuarryDustM3 =
    standardQuarryDustWheelbarrows *
    WHEELBARROW_TO_M3;

  const standardChippingsM3 =
    standardChippingsWheelbarrows *
    WHEELBARROW_TO_M3;

  const standardWater =
    recipe
      ? standardBags *
        ((recipe.waterMin +
          recipe.waterMax) /
          2)
      : 0;

  function handleProductChange(
    value: string
  ) {
    setProductName(value);
    setCementUsed("");
    setWaterUsed("");
  }

  function applyStandardRecipe() {
    if (!recipe || standardBags <= 0) {
      alert(
        "Enter the quantity produced first."
      );
      return;
    }

    setCementUsed(
      standardBags.toFixed(2)
    );

    setWaterUsed(
      standardWater.toFixed(2)
    );
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!productName.trim()) {
      alert("Please select a product.");
      return;
    }

    const quantityNumber = Number(quantity);
    const cementNumber = Number(cementUsed);
    const waterNumber = Number(waterUsed);

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
      cementNumber <= 0
    ) {
      alert(
        "Please enter the cement quantity used."
      );
      return;
    }

    if (
      !Number.isFinite(waterNumber) ||
      waterNumber <= 0
    ) {
      alert(
        "Please enter the water quantity used."
      );
      return;
    }

    if (!recipe || standardBags <= 0) {
      alert(
        "Unable to calculate the production recipe."
      );
      return;
    }

    /*
     * The UI uses wheelbarrows.
     *
     * The database continues to receive
     * aggregate consumption in cubic metres.
     *
     * 1 wheelbarrow = 90 L = 0.09 m³.
     */
    const chippingsM3 =
      standardChippingsM3;

    const quarryDustM3 =
      standardQuarryDustM3;

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
            chippingsM3,

          quarry_dust_used:
            quarryDustM3,

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
      {/* PRODUCT */}

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
            handleProductChange(
              e.target.value
            )
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

      {/* STANDARD RECIPE */}

      {recipe && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="font-semibold text-blue-900">
            Standard Production Recipe
          </h3>

          <p className="mt-1 text-sm text-blue-800">
            Target yield:{" "}
            <strong>
              {recipe.targetYield}
            </strong>{" "}
            blocks per bag of cement
          </p>

          <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
            <div>
              Cement:{" "}
              <strong>
                1 bag
              </strong>
            </div>

            <div>
              Quarry Dust:{" "}
              <strong>
                6 wheelbarrows
              </strong>
            </div>

            <div>
              Chippings:{" "}
              <strong>
                2 wheelbarrows
              </strong>
            </div>

            <div>
              Water:{" "}
              <strong>
                25–30 L
              </strong>
            </div>
          </div>

          <div className="mt-3 text-xs text-blue-700">
            1 wheelbarrow ={" "}
            {WHEELBARROW_LITRES} L
            {" = "}
            {WHEELBARROW_TO_M3.toFixed(2)}
            {" m³"}
          </div>

          <div className="mt-1 text-xs text-blue-700">
            Cement standard cost:
            {" "}
            GH₵{CEMENT_COST.toFixed(2)}
            {" "}
            per bag.
          </div>
        </div>
      )}

      {/* QUANTITY */}

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
          placeholder="Enter actual blocks produced"
          disabled={saving}
          required
        />
      </div>

      {/* STANDARD CALCULATION */}

      {recipe &&
        standardBags > 0 && (
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="text-sm font-semibold">
              Standard requirement for{" "}
              {quantity} blocks
            </p>

            <div className="mt-2 space-y-1 text-sm text-gray-600">
              <p>
                Cement:{" "}
                <strong>
                  {standardBags.toFixed(2)} bags
                </strong>
              </p>

              <p>
                Quarry Dust:{" "}
                <strong>
                  {standardQuarryDustWheelbarrows.toFixed(
                    2
                  )}{" "}
                  wheelbarrows
                </strong>
              </p>

              <p className="text-xs text-gray-500">
                Inventory deduction:{" "}
                {standardQuarryDustM3.toFixed(
                  3
                )}{" "}
                m³
              </p>

              <p>
                Chippings:{" "}
                <strong>
                  {standardChippingsWheelbarrows.toFixed(
                    2
                  )}{" "}
                  wheelbarrows
                </strong>
              </p>

              <p className="text-xs text-gray-500">
                Inventory deduction:{" "}
                {standardChippingsM3.toFixed(
                  3
                )}{" "}
                m³
              </p>

              <p>
                Water target:{" "}
                <strong>
                  {standardWater.toFixed(2)} L
                </strong>
              </p>
            </div>

            <button
              type="button"
              onClick={applyStandardRecipe}
              disabled={saving}
              className="mt-3 rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
            >
              Apply Standard Recipe
            </button>
          </div>
        )}

      {/* CEMENT */}

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
            placeholder="Actual cement used"
            disabled={saving}
            required
          />

          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
            bags
          </span>
        </div>

        <p className="mt-1 text-xs text-gray-500">
          GH₵75.00 per bag
        </p>
      </div>

      {/* WATER */}

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
            placeholder="Actual water used"
            disabled={saving}
            required
          />

          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
            L
          </span>
        </div>

        <p className="mt-1 text-xs text-gray-500">
          Standard range: 25–30 L per bag.
        </p>
      </div>

      {/* SUBMIT */}

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
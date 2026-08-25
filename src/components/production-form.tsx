"use client";

import { FormEvent, useMemo, useState } from "react";
import { createProduction } from "@/services/production";

const PRODUCTS = [
  "5-inch Solid Block",
  "6-inch Solid Block",
  "5-inch Hollow Block",
  "6-inch Hollow Block",
] as const;

type ProductName = (typeof PRODUCTS)[number];

type Recipe = {
  quantity: number;
  cement_used: number;
  chippings_used: number;
  quarry_dust_used: number;
  water_used: number;
};

const RECIPES: Record<ProductName, Recipe> = {
  "5-inch Solid Block": {
    quantity: 60,
    cement_used: 1,
    chippings_used: 0.2,
    quarry_dust_used: 0.6,
    water_used: 80,
  },

  "6-inch Solid Block": {
    quantity: 50,
    cement_used: 1,
    chippings_used: 0.2,
    quarry_dust_used: 0.6,
    water_used: 80,
  },

  "5-inch Hollow Block": {
    quantity: 65,
    cement_used: 1,
    chippings_used: 0.2,
    quarry_dust_used: 0.6,
    water_used: 80,
  },

  "6-inch Hollow Block": {
    quantity: 60,
    cement_used: 1,
    chippings_used: 0.2,
    quarry_dust_used: 0.6,
    water_used: 80,
  },
};

const MATERIAL_COSTS = {
  cement: 75,
  chippings: 235,
  quarryDust: 235,
  water: 0.5,
};

type ProductionFormProps = {
  onSuccess?: () => void;
};

export default function ProductionForm({
  onSuccess,
}: ProductionFormProps) {
  const [productName, setProductName] =
    useState<ProductName>("5-inch Solid Block");

  const [quantity, setQuantity] = useState("");
  const [cementUsed, setCementUsed] = useState("");
  const [chippingsUsed, setChippingsUsed] = useState("");
  const [quarryDustUsed, setQuarryDustUsed] =
    useState("");
  const [waterUsed, setWaterUsed] = useState("");

  const [useRecipe, setUseRecipe] = useState(true);
  const [loading, setLoading] = useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const selectedRecipe = RECIPES[productName];

  const costPreview = useMemo(() => {
    const cement = Number(cementUsed || 0);
    const chippings = Number(chippingsUsed || 0);
    const quarryDust = Number(quarryDustUsed || 0);
    const water = Number(waterUsed || 0);
    const qty = Number(quantity || 0);

    const cementCost =
      cement * MATERIAL_COSTS.cement;

    const chippingsCost =
      chippings * MATERIAL_COSTS.chippings;

    const quarryDustCost =
      quarryDust * MATERIAL_COSTS.quarryDust;

    const waterCost =
      water * MATERIAL_COSTS.water;

    const totalCost =
      cementCost +
      chippingsCost +
      quarryDustCost +
      waterCost;

    const costPerBlock =
      qty > 0 ? totalCost / qty : 0;

    return {
      cementCost,
      chippingsCost,
      quarryDustCost,
      waterCost,
      totalCost,
      costPerBlock,
    };
  }, [
    cementUsed,
    chippingsUsed,
    quarryDustUsed,
    waterUsed,
    quantity,
  ]);

  function applyRecipe(product: ProductName) {
    const recipe = RECIPES[product];

    setQuantity(String(recipe.quantity));
    setCementUsed(String(recipe.cement_used));
    setChippingsUsed(
      String(recipe.chippings_used)
    );
    setQuarryDustUsed(
      String(recipe.quarry_dust_used)
    );
    setWaterUsed(String(recipe.water_used));
  }

  function handleProductChange(
    value: ProductName
  ) {
    setProductName(value);

    if (useRecipe) {
      applyRecipe(value);
    }
  }

  function handleRecipeChange(
    checked: boolean
  ) {
    setUseRecipe(checked);

    if (checked) {
      applyRecipe(productName);
    }
  }

  function clearForm() {
    setQuantity("");
    setCementUsed("");
    setChippingsUsed("");
    setQuarryDustUsed("");
    setWaterUsed("");

    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const trimmedProduct =
      productName.trim();

    const quantityNumber = Number(quantity);
    const cementNumber = Number(cementUsed);
    const chippingsNumber =
      Number(chippingsUsed);
    const quarryDustNumber =
      Number(quarryDustUsed);
    const waterNumber = Number(waterUsed);

    if (!trimmedProduct) {
      setErrorMessage(
        "Product is required."
      );
      return;
    }

    if (
      !Number.isInteger(quantityNumber) ||
      quantityNumber <= 0
    ) {
      setErrorMessage(
        "Production quantity must be a positive whole number."
      );
      return;
    }

    if (
      !Number.isFinite(cementNumber) ||
      cementNumber < 0
    ) {
      setErrorMessage(
        "Cement quantity cannot be negative."
      );
      return;
    }

    if (
      !Number.isFinite(chippingsNumber) ||
      chippingsNumber < 0
    ) {
      setErrorMessage(
        "Chippings quantity cannot be negative."
      );
      return;
    }

    if (
      !Number.isFinite(quarryDustNumber) ||
      quarryDustNumber < 0
    ) {
      setErrorMessage(
        "Quarry dust quantity cannot be negative."
      );
      return;
    }

    if (
      !Number.isFinite(waterNumber) ||
      waterNumber < 0
    ) {
      setErrorMessage(
        "Water quantity cannot be negative."
      );
      return;
    }

    setLoading(true);

    try {
      const result = await createProduction({
        product_name: trimmedProduct,

        quantity: quantityNumber,

        cement_used: cementNumber,

        chippings_used: chippingsNumber,

        quarry_dust_used: quarryDustNumber,

        water_used: waterNumber,
      });

      if (result.error) {
        setErrorMessage(
          result.error.message
        );
        return;
      }

      setSuccessMessage(
        `${quantityNumber.toLocaleString()} ${trimmedProduct} recorded successfully.`
      );

      clearForm();

      onSuccess?.();
    } catch (error) {
      console.error(
        "Production form error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to record production."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-bold">
          Record Production
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Record finished block production and
          automatically calculate production cost.
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
        >
          {successMessage}
        </div>
      )}

      {/* Product */}
      <div className="space-y-2">
        <label
          htmlFor="production-product"
          className="block text-sm font-semibold"
        >
          Product
        </label>

        <select
          id="production-product"
          value={productName}
          onChange={(event) =>
            handleProductChange(
              event.target.value as ProductName
            )
          }
          disabled={loading}
          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 disabled:bg-gray-100"
        >
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

      {/* Recipe */}
      <div className="rounded-lg border bg-gray-50 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">
              Standard Recipe
            </p>

            <p className="text-xs text-gray-500">
              Use the standard material recipe for
              the selected block.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useRecipe}
              onChange={(event) =>
                handleRecipeChange(
                  event.target.checked
                )
              }
              disabled={loading}
              className="h-4 w-4"
            />

            Use recipe
          </label>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-lg bg-white p-3">
            <p className="text-xs text-gray-500">
              Standard Yield
            </p>
            <p className="mt-1 font-semibold">
              {selectedRecipe.quantity} pcs
            </p>
          </div>

          <div className="rounded-lg bg-white p-3">
            <p className="text-xs text-gray-500">
              Cement
            </p>
            <p className="mt-1 font-semibold">
              {selectedRecipe.cement_used} bag
            </p>
          </div>

          <div className="rounded-lg bg-white p-3">
            <p className="text-xs text-gray-500">
              Chippings
            </p>
            <p className="mt-1 font-semibold">
              {selectedRecipe.chippings_used} m³
            </p>
          </div>

          <div className="rounded-lg bg-white p-3">
            <p className="text-xs text-gray-500">
              Quarry Dust
            </p>
            <p className="mt-1 font-semibold">
              {selectedRecipe.quarry_dust_used} m³
            </p>
          </div>

          <div className="rounded-lg bg-white p-3">
            <p className="text-xs text-gray-500">
              Water
            </p>
            <p className="mt-1 font-semibold">
              {selectedRecipe.water_used} L
            </p>
          </div>
        </div>
      </div>

      {/* Production Quantity */}
      <div className="space-y-2">
        <label
          htmlFor="production-quantity"
          className="block text-sm font-semibold"
        >
          Production Quantity
        </label>

        <div className="relative">
          <input
            id="production-quantity"
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(event) =>
              setQuantity(event.target.value)
            }
            disabled={loading}
            required
            placeholder="e.g. 60"
            className="w-full rounded-lg border px-3 py-2.5 pr-16 text-sm outline-none focus:ring-2 disabled:bg-gray-100"
          />

          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
            pcs
          </span>
        </div>
      </div>

      {/* Materials */}
      <div>
        <h3 className="mb-3 text-sm font-bold">
          Materials Used
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Cement */}
          <div className="space-y-2">
            <label
              htmlFor="production-cement"
              className="block text-sm font-semibold"
            >
              Cement
            </label>

            <div className="relative">
              <input
                id="production-cement"
                type="number"
                min="0"
                step="0.01"
                value={cementUsed}
                onChange={(event) =>
                  setCementUsed(
                    event.target.value
                  )
                }
                disabled={loading}
                placeholder="e.g. 1"
                className="w-full rounded-lg border px-3 py-2.5 pr-16 text-sm outline-none focus:ring-2 disabled:bg-gray-100"
              />

              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                bags
              </span>
            </div>

            <p className="text-xs text-gray-500">
              Current price: GH₵75.00 / bag
            </p>
          </div>

          {/* Chippings */}
          <div className="space-y-2">
            <label
              htmlFor="production-chippings"
              className="block text-sm font-semibold"
            >
              Chippings
            </label>

            <div className="relative">
              <input
                id="production-chippings"
                type="number"
                min="0"
                step="0.01"
                value={chippingsUsed}
                onChange={(event) =>
                  setChippingsUsed(
                    event.target.value
                  )
                }
                disabled={loading}
                placeholder="e.g. 0.20"
                className="w-full rounded-lg border px-3 py-2.5 pr-16 text-sm outline-none focus:ring-2 disabled:bg-gray-100"
              />

              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                m³
              </span>
            </div>

            <p className="text-xs text-gray-500">
              Current price: GH₵235.00 / m³
            </p>
          </div>

          {/* Quarry Dust */}
          <div className="space-y-2">
            <label
              htmlFor="production-quarry-dust"
              className="block text-sm font-semibold"
            >
              Quarry Dust
            </label>

            <div className="relative">
              <input
                id="production-quarry-dust"
                type="number"
                min="0"
                step="0.01"
                value={quarryDustUsed}
                onChange={(event) =>
                  setQuarryDustUsed(
                    event.target.value
                  )
                }
                disabled={loading}
                placeholder="e.g. 0.60"
                className="w-full rounded-lg border px-3 py-2.5 pr-16 text-sm outline-none focus:ring-2 disabled:bg-gray-100"
              />

              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                m³
              </span>
            </div>

            <p className="text-xs text-gray-500">
              Current price: GH₵235.00 / m³
            </p>
          </div>

          {/* Water */}
          <div className="space-y-2">
            <label
              htmlFor="production-water"
              className="block text-sm font-semibold"
            >
              Water
            </label>

            <div className="relative">
              <input
                id="production-water"
                type="number"
                min="0"
                step="0.01"
                value={waterUsed}
                onChange={(event) =>
                  setWaterUsed(
                    event.target.value
                  )
                }
                disabled={loading}
                placeholder="e.g. 80"
                className="w-full rounded-lg border px-3 py-2.5 pr-16 text-sm outline-none focus:ring-2 disabled:bg-gray-100"
              />

              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                L
              </span>
            </div>

            <p className="text-xs text-gray-500">
              Current price: GH₵0.50 / L
            </p>
          </div>
        </div>
      </div>

      {/* Cost Preview */}
      <div className="rounded-xl border bg-gray-50 p-5">
        <h3 className="text-sm font-bold">
          Production Cost Preview
        </h3>

        <div className="mt-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">
              Cement
            </span>

            <span className="font-medium">
              GH₵
              {costPreview.cementCost.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-gray-600">
              Chippings
            </span>

            <span className="font-medium">
              GH₵
              {costPreview.chippingsCost.toFixed(
                2
              )}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-gray-600">
              Quarry Dust
            </span>

            <span className="font-medium">
              GH₵
              {costPreview.quarryDustCost.toFixed(
                2
              )}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-gray-600">
              Water
            </span>

            <span className="font-medium">
              GH₵
              {costPreview.waterCost.toFixed(2)}
            </span>
          </div>

          <div className="border-t pt-3">
            <div className="flex justify-between">
              <span className="font-semibold">
                Total Production Cost
              </span>

              <span className="text-lg font-bold">
                GH₵
                {costPreview.totalCost.toFixed(2)}
              </span>
            </div>

            <div className="mt-2 flex justify-between">
              <span className="text-sm text-gray-600">
                Cost Per Block
              </span>

              <span className="font-semibold">
                GH₵
                {costPreview.costPerBlock.toFixed(
                  2
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={clearForm}
          disabled={loading}
          className="rounded-lg border px-5 py-2.5 text-sm font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear
        </button>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Recording Production..."
            : "Record Production"}
        </button>
      </div>
    </form>
  );
}
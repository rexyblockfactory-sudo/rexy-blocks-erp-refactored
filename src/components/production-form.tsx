"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createProduction } from "@/services/production";
import {
  getProductionRecipes,
  type ProductionRecipe,
} from "@/services/production-recipes";
import { getInventoryCosts } from "@/services/inventory";

type ProductionFormProps = {
  onSuccess?: () => void;
};

type MaterialCosts = {
  Cement: number;
  "Quarry Dust": number;
  Chippings: number;
  Water: number;
};

export default function ProductionForm({
  onSuccess,
}: ProductionFormProps) {
  const [recipes, setRecipes] = useState<
    ProductionRecipe[]
  >([]);

  const [recipesLoading, setRecipesLoading] =
    useState(true);

  const [recipesError, setRecipesError] =
    useState("");

  const [materialCosts, setMaterialCosts] =
    useState<Partial<MaterialCosts>>({});

  const [costsLoading, setCostsLoading] =
    useState(true);

  const [costsError, setCostsError] =
    useState("");

  const [productName, setProductName] =
    useState("");

  const [quantity, setQuantity] =
    useState("");

  const [cementUsed, setCementUsed] =
    useState("");

  const [waterUsed, setWaterUsed] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  /*
   * Load official production recipes
   * from Supabase.
   */
  useEffect(() => {
    let mounted = true;

    async function loadRecipes() {
      setRecipesLoading(true);
      setRecipesError("");

      const result =
        await getProductionRecipes();

      if (!mounted) {
        return;
      }

      if (result.error) {
        console.error(
          "Production recipes error:",
          result.error
        );

        setRecipesError(
          result.error.message
        );

        setRecipes([]);
      } else {
        setRecipes(result.data);

        if (
          result.data.length > 0
        ) {
          setProductName(
            result.data[0].product_name
          );
        }
      }

      setRecipesLoading(false);
    }

    loadRecipes();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * Load current material costs
   * from inventory.
   */
  useEffect(() => {
    let mounted = true;

    async function loadMaterialCosts() {
      setCostsLoading(true);
      setCostsError("");

      const result =
        await getInventoryCosts();

      if (!mounted) {
        return;
      }

      if (result.error) {
        console.error(
          "Material cost error:",
          result.error
        );

        setCostsError(
          result.error.message
        );

        setMaterialCosts({});
      } else {
        setMaterialCosts(
          result.data
        );
      }

      setCostsLoading(false);
    }

    loadMaterialCosts();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * Selected recipe.
   */
  const selectedRecipe =
    useMemo(
      () =>
        recipes.find(
          (recipe) =>
            recipe.product_name ===
            productName
        ) ?? null,
      [recipes, productName]
    );

  /*
   * Calculate standard production
   * requirements dynamically.
   *
   * Example for 5-inch Solid:
   *
   * 60 blocks
   * ÷ 60 blocks/bag
   * = 1 production batch
   *
   * 6 wheelbarrows × 90 L
   * = 540 L
   * = 0.540 m³
   */
  const standardRequirement =
    useMemo(() => {
      if (!selectedRecipe) {
        return null;
      }

      const quantityNumber =
        Number(quantity);

      if (
        !Number.isFinite(
          quantityNumber
        ) ||
        quantityNumber <= 0
      ) {
        return null;
      }

      const batches =
        quantityNumber /
        selectedRecipe.target_yield;

      const cementBags =
        batches *
        selectedRecipe.cement_bags;

      const quarryDustWheelbarrows =
        batches *
        selectedRecipe.quarry_dust_wheelbarrows;

      const chippingsWheelbarrows =
        batches *
        selectedRecipe.chippings_wheelbarrows;

      const quarryDustM3 =
        (quarryDustWheelbarrows *
          selectedRecipe.wheelbarrow_litres) /
        1000;

      const chippingsM3 =
        (chippingsWheelbarrows *
          selectedRecipe.wheelbarrow_litres) /
        1000;

      const waterMin =
        batches *
        selectedRecipe.water_min_litres;

      const waterMax =
        batches *
        selectedRecipe.water_max_litres;

      const waterTarget =
        (waterMin + waterMax) / 2;

      return {
        batches,
        cementBags,
        quarryDustWheelbarrows,
        chippingsWheelbarrows,
        quarryDustM3,
        chippingsM3,
        waterMin,
        waterMax,
        waterTarget,
      };
    }, [
      selectedRecipe,
      quantity,
    ]);

  /*
   * Current inventory prices.
   */
  const cementCostPerBag =
    Number(
      materialCosts["Cement"] ?? 0
    );

  const quarryDustCostPerM3 =
    Number(
      materialCosts["Quarry Dust"] ?? 0
    );

  const chippingsCostPerM3 =
    Number(
      materialCosts["Chippings"] ?? 0
    );

  const waterCostPerLitre =
    Number(
      materialCosts["Water"] ?? 0
    );

  /*
   * Check that all required prices
   * exist before allowing production.
   */
  const missingMaterialCosts =
    useMemo(() => {
      const missing: string[] = [];

      if (
        !Number.isFinite(
          materialCosts["Cement"]
        )
      ) {
        missing.push("Cement");
      }

      if (
        !Number.isFinite(
          materialCosts["Quarry Dust"]
        )
      ) {
        missing.push("Quarry Dust");
      }

      if (
        !Number.isFinite(
          materialCosts["Chippings"]
        )
      ) {
        missing.push("Chippings");
      }

      if (
        !Number.isFinite(
          materialCosts["Water"]
        )
      ) {
        missing.push("Water");
      }

      return missing;
    }, [materialCosts]);

  /*
   * Production cost preview.
   *
   * Chippings and Quarry Dust are
   * automatically calculated from the
   * recipe and converted to m³.
   */
  const costPreview = useMemo(() => {
    const cement =
      Number(cementUsed || 0);

    const water =
      Number(waterUsed || 0);

    const chippings =
      standardRequirement
        ?.chippingsM3 ?? 0;

    const quarryDust =
      standardRequirement
        ?.quarryDustM3 ?? 0;

    const quantityNumber =
      Number(quantity || 0);

    const cementCost =
      cement *
      cementCostPerBag;

    const chippingsCost =
      chippings *
      chippingsCostPerM3;

    const quarryDustCost =
      quarryDust *
      quarryDustCostPerM3;

    const waterCost =
      water *
      waterCostPerLitre;

    const totalCost =
      cementCost +
      chippingsCost +
      quarryDustCost +
      waterCost;

    const costPerBlock =
      quantityNumber > 0
        ? totalCost / quantityNumber
        : 0;

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
    waterUsed,
    quantity,
    standardRequirement,
    cementCostPerBag,
    quarryDustCostPerM3,
    chippingsCostPerM3,
    waterCostPerLitre,
  ]);

  function handleProductChange(
    value: string
  ) {
    setProductName(value);

    setQuantity("");
    setCementUsed("");
    setWaterUsed("");

    setErrorMessage("");
    setSuccessMessage("");
  }

  function applyStandardRecipe() {
    if (
      !selectedRecipe ||
      !standardRequirement
    ) {
      setErrorMessage(
        "Enter the production quantity first."
      );

      return;
    }

    setCementUsed(
      standardRequirement.cementBags.toFixed(
        2
      )
    );

    setWaterUsed(
      standardRequirement.waterTarget.toFixed(
        2
      )
    );

    setErrorMessage("");
  }

  function clearForm() {
    setQuantity("");
    setCementUsed("");
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

    if (!selectedRecipe) {
      setErrorMessage(
        "Please select a valid production recipe."
      );

      return;
    }

    if (costsLoading) {
      setErrorMessage(
        "Material costs are still loading. Please wait."
      );

      return;
    }

    if (
      missingMaterialCosts.length > 0
    ) {
      setErrorMessage(
        `Cannot record production. Missing inventory cost for: ${missingMaterialCosts.join(
          ", "
        )}.`
      );

      return;
    }

    const trimmedProduct =
      selectedRecipe.product_name.trim();

    const quantityNumber =
      Number(quantity);

    const cementNumber =
      Number(cementUsed);

    const waterNumber =
      Number(waterUsed);

    if (!trimmedProduct) {
      setErrorMessage(
        "Product is required."
      );

      return;
    }

    if (
      !Number.isInteger(
        quantityNumber
      ) ||
      quantityNumber <= 0
    ) {
      setErrorMessage(
        "Production quantity must be a positive whole number."
      );

      return;
    }

    if (
      !Number.isFinite(
        cementNumber
      ) ||
      cementNumber <= 0
    ) {
      setErrorMessage(
        "Cement quantity must be greater than zero."
      );

      return;
    }

    if (
      !Number.isFinite(
        waterNumber
      ) ||
      waterNumber <= 0
    ) {
      setErrorMessage(
        "Water quantity must be greater than zero."
      );

      return;
    }

    if (
      !standardRequirement
    ) {
      setErrorMessage(
        "Unable to calculate the standard production requirement."
      );

      return;
    }

    /*
     * IMPORTANT:
     *
     * These values are NOT entered by
     * the operator.
     *
     * They are calculated from the
     * official database recipe.
     */
    const chippingsM3 =
      standardRequirement.chippingsM3;

    const quarryDustM3 =
      standardRequirement.quarryDustM3;

    setLoading(true);

    try {
      const result =
        await createProduction({
          product_name:
            trimmedProduct,

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

  const cannotRecord =
    loading ||
    recipesLoading ||
    costsLoading ||
    recipes.length === 0 ||
    missingMaterialCosts.length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border bg-white p-6 shadow-sm"
    >
      {/* HEADER */}

      <div>
        <h2 className="text-xl font-bold">
          Record Production
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Record finished block production
          using the official factory recipe.
        </p>
      </div>

      {/* ERROR */}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {/* SUCCESS */}

      {successMessage && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
        >
          {successMessage}
        </div>
      )}

      {/* RECIPE ERROR */}

      {recipesError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          Unable to load production recipes:
          {" "}
          {recipesError}
        </div>
      )}

      {/* COST ERROR */}

      {costsError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          Unable to load current inventory
          costs:
          {" "}
          {costsError}
        </div>
      )}

      {/* PRODUCT */}

      <div className="space-y-2">
        <label
          htmlFor="production-product"
          className="block text-sm font-semibold"
        >
          Product Name
        </label>

        <select
          id="production-product"
          value={productName}
          onChange={(event) =>
            handleProductChange(
              event.target.value
            )
          }
          disabled={
            loading ||
            recipesLoading
          }
          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 disabled:bg-gray-100"
          required
        >
          <option value="">
            Select product
          </option>

          {recipes.map(
            (recipe) => (
              <option
                key={recipe.id}
                value={
                  recipe.product_name
                }
              >
                {recipe.product_name}
              </option>
            )
          )}
        </select>
      </div>

      {/* STANDARD RECIPE */}

      {selectedRecipe && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="font-semibold text-blue-900">
            Standard Production Recipe
          </h3>

          <p className="mt-1 text-sm text-blue-800">
            Target yield:{" "}
            <strong>
              {selectedRecipe.target_yield}
            </strong>{" "}
            blocks per bag of cement
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-gray-500">
                Cement
              </p>

              <p className="mt-1 font-semibold">
                {selectedRecipe.cement_bags}{" "}
                bag
              </p>
            </div>

            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-gray-500">
                Quarry Dust
              </p>

              <p className="mt-1 font-semibold">
                {
                  selectedRecipe.quarry_dust_wheelbarrows
                }{" "}
                wheelbarrows
              </p>
            </div>

            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-gray-500">
                Chippings
              </p>

              <p className="mt-1 font-semibold">
                {
                  selectedRecipe.chippings_wheelbarrows
                }{" "}
                wheelbarrows
              </p>
            </div>

            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-gray-500">
                Water
              </p>

              <p className="mt-1 font-semibold">
                {
                  selectedRecipe.water_min_litres
                }
                –
                {
                  selectedRecipe.water_max_litres
                }{" "}
                L
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-white p-3 text-sm">
            <p className="font-semibold">
              Factory Measurement
            </p>

            <p className="mt-1 text-gray-600">
              1 wheelbarrow ={" "}
              {
                selectedRecipe.wheelbarrow_litres
              }
              {" L = "}
              {(
                selectedRecipe.wheelbarrow_litres /
                1000
              ).toFixed(2)}
              {" m³"}
            </p>

            <p className="mt-1 text-gray-600">
              Quarry Dust per bag ={" "}
              {(
                selectedRecipe
                  .quarry_dust_wheelbarrows *
                selectedRecipe.wheelbarrow_litres /
                1000
              ).toFixed(3)}
              {" m³"}
            </p>

            <p className="mt-1 text-gray-600">
              Chippings per bag ={" "}
              {(
                selectedRecipe
                  .chippings_wheelbarrows *
                selectedRecipe.wheelbarrow_litres /
                1000
              ).toFixed(3)}
              {" m³"}
            </p>
          </div>
        </div>
      )}

      {/* QUANTITY */}

      <div className="space-y-2">
        <label
          htmlFor="production-quantity"
          className="block text-sm font-semibold"
        >
          Quantity Produced
        </label>

        <div className="relative">
          <input
            id="production-quantity"
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(event) =>
              setQuantity(
                event.target.value
              )
            }
            disabled={
              loading ||
              recipesLoading
            }
            required
            placeholder="Enter actual blocks produced"
            className="w-full rounded-lg border px-3 py-2.5 pr-16 text-sm outline-none focus:ring-2 disabled:bg-gray-100"
          />

          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
            pcs
          </span>
        </div>
      </div>

      {/* AUTOMATIC REQUIREMENT */}

      {standardRequirement && (
        <div className="rounded-lg border bg-gray-50 p-5">
          <h3 className="text-sm font-bold">
            Standard Requirement for{" "}
            {Number(
              quantity
            ).toLocaleString()}{" "}
            Blocks
          </h3>

          <div className="mt-4 grid gap-3 md:grid-cols-2">

            {/* CEMENT */}

            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-gray-500">
                Cement
              </p>

              <p className="mt-1 font-semibold">
                {standardRequirement.cementBags.toFixed(
                  2
                )}{" "}
                bags
              </p>
            </div>

            {/* QUARRY DUST */}

            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-gray-500">
                Quarry Dust
              </p>

              <p className="mt-1 font-semibold">
                {standardRequirement.quarryDustWheelbarrows.toFixed(
                  2
                )}{" "}
                wheelbarrows
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Inventory deduction:{" "}
                {standardRequirement.quarryDustM3.toFixed(
                  3
                )}{" "}
                m³
              </p>
            </div>

            {/* CHIPPINGS */}

            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-gray-500">
                Chippings
              </p>

              <p className="mt-1 font-semibold">
                {standardRequirement.chippingsWheelbarrows.toFixed(
                  2
                )}{" "}
                wheelbarrows
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Inventory deduction:{" "}
                {standardRequirement.chippingsM3.toFixed(
                  3
                )}{" "}
                m³
              </p>
            </div>

            {/* WATER */}

            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-gray-500">
                Water Target
              </p>

              <p className="mt-1 font-semibold">
                {standardRequirement.waterTarget.toFixed(
                  2
                )}{" "}
                L
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Range:{" "}
                {standardRequirement.waterMin.toFixed(
                  2
                )}
                –
                {standardRequirement.waterMax.toFixed(
                  2
                )}{" "}
                L
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={applyStandardRecipe}
            disabled={loading}
            className="mt-4 rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply Standard Recipe
          </button>
        </div>
      )}

      {/* ACTUAL MATERIAL INPUTS */}

      <div>
        <h3 className="mb-3 text-sm font-bold">
          Actual Materials Used
        </h3>

        <div className="grid gap-4 md:grid-cols-2">

          {/* CEMENT */}

          <div className="space-y-2">
            <label
              htmlFor="production-cement"
              className="block text-sm font-semibold"
            >
              Cement Used
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
                required
                className="w-full rounded-lg border px-3 py-2.5 pr-16 text-sm outline-none focus:ring-2 disabled:bg-gray-100"
              />

              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                bags
              </span>
            </div>

            <p className="text-xs text-gray-500">
              Current inventory cost:{" "}
              {costsLoading
                ? "Loading..."
                : `GH₵${cementCostPerBag.toFixed(
                    2
                  )} / bag`}
            </p>
          </div>

          {/* WATER */}

          <div className="space-y-2">
            <label
              htmlFor="production-water"
              className="block text-sm font-semibold"
            >
              Water Used
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
                placeholder="e.g. 27.5"
                required
                className="w-full rounded-lg border px-3 py-2.5 pr-16 text-sm outline-none focus:ring-2 disabled:bg-gray-100"
              />

              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                L
              </span>
            </div>

            <p className="text-xs text-gray-500">
              Current inventory cost:{" "}
              {costsLoading
                ? "Loading..."
                : `GH₵${waterCostPerLitre.toFixed(
                    2
                  )} / L`}
            </p>
          </div>
        </div>

        {/* AUTOMATIC AGGREGATES */}

        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">
            Quarry Dust and Chippings are
            calculated automatically.
          </p>

          <p className="mt-1 text-xs text-blue-700">
            The operator does not enter m³.
            The ERP uses the official
            wheelbarrow recipe and converts the
            quantities to m³ for inventory and
            costing.
          </p>

          <div className="mt-3 grid gap-2 text-sm">
            <p>
              Quarry Dust cost:{" "}
              <strong>
                {costsLoading
                  ? "Loading..."
                  : `GH₵${quarryDustCostPerM3.toFixed(
                      2
                    )} / m³`}
              </strong>
            </p>

            <p>
              Chippings cost:{" "}
              <strong>
                {costsLoading
                  ? "Loading..."
                  : `GH₵${chippingsCostPerM3.toFixed(
                      2
                    )} / m³`}
              </strong>
            </p>
          </div>
        </div>
      </div>

      {/* COST PREVIEW */}

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
              {costPreview.cementCost.toFixed(
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
              Water
            </span>

            <span className="font-medium">
              GH₵
              {costPreview.waterCost.toFixed(
                2
              )}
            </span>
          </div>

          <div className="border-t pt-3">
            <div className="flex justify-between">
              <span className="font-semibold">
                Total Production Cost
              </span>

              <span className="text-lg font-bold">
                GH₵
                {costPreview.totalCost.toFixed(
                  2
                )}
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

      {/* SUBMIT */}

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
          disabled={cannotRecord}
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
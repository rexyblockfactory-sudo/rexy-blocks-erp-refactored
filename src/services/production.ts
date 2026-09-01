import { supabase } from "@/lib/supabase/client";

import type {
  CreateProductionInput,
  Production,
} from "@/types/production";

/**
 * Get production history.
 */
export async function getProduction(): Promise<{
  data: Production[] | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("production")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "getProduction error:",
      {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      }
    );

    return {
      data: null,
      error: new Error(
        error.message ||
          "Failed to load production history."
      ),
    };
  }

  return {
    data: (data ?? []) as Production[],
    error: null,
  };
}

/**
 * Create production using the database RPC.
 *
 * The database function:
 *
 * create_production_with_inventory(
 *   p_product_name,
 *   p_quantity,
 *   p_cement_used,
 *   p_chippings_used,
 *   p_quarry_dust_used,
 *   p_water_used
 * )
 *
 * is responsible for:
 *
 * 1. Checking raw-material inventory.
 * 2. Deducting raw materials.
 * 3. Creating the production record.
 * 4. Creating finished goods.
 * 5. Creating production costing.
 * 6. Recording inventory movements.
 *
 * All of those operations should occur atomically
 * inside the database transaction.
 */
export async function createProduction(
  input: CreateProductionInput
): Promise<{
  data: Production | null;
  error: Error | null;
}> {
  /*
   * PRODUCT
   */
  const productName =
    input.product_name?.trim();

  if (!productName) {
    return {
      data: null,
      error: new Error(
        "Product is required."
      ),
    };
  }

  /*
   * PRODUCTION QUANTITY
   */
  if (
    !Number.isInteger(
      input.quantity
    ) ||
    input.quantity <= 0
  ) {
    return {
      data: null,
      error: new Error(
        "Production quantity must be a positive whole number."
      ),
    };
  }

  /*
   * CEMENT
   */
  if (
    !Number.isFinite(
      input.cement_used
    ) ||
    input.cement_used < 0
  ) {
    return {
      data: null,
      error: new Error(
        "Cement quantity cannot be negative."
      ),
    };
  }

  /*
   * CHIPPINGS
   *
   * Stored in inventory as cubic metres.
   *
   * Example:
   *
   * 2 wheelbarrows × 90 L
   * = 180 L
   * = 0.18 m³
   */
  if (
    !Number.isFinite(
      input.chippings_used
    ) ||
    input.chippings_used < 0
  ) {
    return {
      data: null,
      error: new Error(
        "Chippings quantity cannot be negative."
      ),
    };
  }

  /*
   * QUARRY DUST
   *
   * Stored in inventory as cubic metres.
   *
   * Example:
   *
   * 6 wheelbarrows × 90 L
   * = 540 L
   * = 0.54 m³
   */
  if (
    !Number.isFinite(
      input.quarry_dust_used
    ) ||
    input.quarry_dust_used < 0
  ) {
    return {
      data: null,
      error: new Error(
        "Quarry dust quantity cannot be negative."
      ),
    };
  }

  /*
   * WATER
   *
   * Stored in litres.
   */
  if (
    !Number.isFinite(
      input.water_used
    ) ||
    input.water_used < 0
  ) {
    return {
      data: null,
      error: new Error(
        "Water quantity cannot be negative."
      ),
    };
  }

  /*
   * Debug information.
   *
   * This allows us to verify exactly what the
   * Production page is sending to Supabase.
   */
  console.log(
    "CREATE PRODUCTION INPUT:",
    {
      product_name:
        productName,

      quantity:
        input.quantity,

      cement_used:
        input.cement_used,

      chippings_used:
        input.chippings_used,

      quarry_dust_used:
        input.quarry_dust_used,

      water_used:
        input.water_used,
    }
  );

  /*
   * CALL DATABASE RPC
   */
  const { data, error } =
    await supabase.rpc(
      "create_production_with_inventory",
      {
        p_product_name:
          productName,

        p_quantity:
          input.quantity,

        p_cement_used:
          input.cement_used,

        p_chippings_used:
          input.chippings_used,

        p_quarry_dust_used:
          input.quarry_dust_used,

        p_water_used:
          input.water_used,
      }
    );

  /*
   * DATABASE ERROR
   */
  if (error) {
    /*
     * Supabase/PostgREST error objects can appear
     * as "{}" when logged directly in the browser.
     *
     * Extract every useful property explicitly.
     */
    const rpcError = {
      name:
        error.name,

      message:
        error.message,

      details:
        error.details,

      hint:
        error.hint,

      code:
        error.code,

      stack:
        error.stack,
    };

    console.error(
      "create_production_with_inventory ERROR:",
      rpcError
    );

    /*
     * Also print a JSON representation so the
     * browser console cannot hide the properties.
     */
    console.error(
      "create_production_with_inventory ERROR JSON:",
      JSON.stringify(
        rpcError,
        null,
        2
      )
    );

    return {
      data: null,
      error: new Error(
        error.message ||
          error.details ||
          error.hint ||
          "Production could not be recorded."
      ),
    };
  }

  /*
   * RPC returned no data.
   */
  if (!data) {
    console.error(
      "create_production_with_inventory returned no data."
    );

    return {
      data: null,
      error: new Error(
        "Production was processed, but no production record was returned."
      ),
    };
  }

  /*
   * SUCCESS
   */
  console.log(
    "CREATE PRODUCTION SUCCESS:",
    data
  );

  return {
    data: data as Production,
    error: null,
  };
}
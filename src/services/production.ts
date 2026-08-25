import { supabase } from "@/lib/supabase/client";
import type {
  CreateProductionInput,
  Production,
} from "@/types/production";

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
    console.error("Production error:", error);

    return {
      data: null,
      error: new Error(error.message),
    };
  }

  return {
    data: (data || []) as Production[],
    error: null,
  };
}

export async function createProduction(
  input: CreateProductionInput
): Promise<{
  data: Production | null;
  error: Error | null;
}> {
  if (!input.product_name?.trim()) {
    return {
      data: null,
      error: new Error("Product is required."),
    };
  }

  if (
    !Number.isInteger(input.quantity) ||
    input.quantity <= 0
  ) {
    return {
      data: null,
      error: new Error(
        "Production quantity must be a positive whole number."
      ),
    };
  }

  if (
    !Number.isFinite(input.cement_used) ||
    input.cement_used < 0
  ) {
    return {
      data: null,
      error: new Error(
        "Cement quantity cannot be negative."
      ),
    };
  }

  if (
    !Number.isFinite(input.chippings_used) ||
    input.chippings_used < 0
  ) {
    return {
      data: null,
      error: new Error(
        "Chippings quantity cannot be negative."
      ),
    };
  }

  if (
    !Number.isFinite(input.quarry_dust_used) ||
    input.quarry_dust_used < 0
  ) {
    return {
      data: null,
      error: new Error(
        "Quarry dust quantity cannot be negative."
      ),
    };
  }

  if (
    !Number.isFinite(input.water_used) ||
    input.water_used < 0
  ) {
    return {
      data: null,
      error: new Error(
        "Water quantity cannot be negative."
      ),
    };
  }

  const { data, error } = await supabase.rpc(
    "create_production_with_inventory",
    {
      p_product_name:
        input.product_name.trim(),

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

  if (error) {
    console.error(
      "create_production_with_inventory error:",
      error
    );

    return {
      data: null,
      error: new Error(error.message),
    };
  }

  if (!data) {
    return {
      data: null,
      error: new Error(
        "Production was recorded, but no production record was returned."
      ),
    };
  }

  return {
    data: data as Production,
    error: null,
  };
}
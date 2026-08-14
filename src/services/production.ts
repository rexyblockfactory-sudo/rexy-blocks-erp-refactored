import { supabase } from "@/lib/supabase/client";
import type {
  CreateProductionInput,
  ProductionRecord,
} from "@/types/production";

export async function getProduction() {
  return supabase
    .from("production")
    .select("*")
    .order("created_at", {
      ascending: false,
    });
}

export async function getRecentProduction(
  limit = 5
) {
  return supabase
    .from("production")
    .select("*")
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);
}

export async function createProduction(
  input: CreateProductionInput
): Promise<{
  data: ProductionRecord | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("production")
    .insert([
      {
        product_name: input.product_name,
        quantity: input.quantity,
        cement_used: input.cement_used,
        sand_used: input.sand_used,
        quarry_dust_used:
          input.quarry_dust_used,
        water_used: input.water_used,
      },
    ])
    .select()
    .single();

  if (error) {
    return {
      data: null,
      error: new Error(error.message),
    };
  }

  return {
    data: data as ProductionRecord,
    error: null,
  };
}
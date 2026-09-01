import { supabase } from "@/lib/supabase/client";

export type ProductionRecipe = {
  id: string;
  product_name: string;
  target_yield: number;
  cement_bags: number;
  quarry_dust_wheelbarrows: number;
  chippings_wheelbarrows: number;
  water_min_litres: number;
  water_max_litres: number;
  wheelbarrow_litres: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export async function getProductionRecipes(): Promise<{
  data: ProductionRecipe[];
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("production_recipes")
    .select("*")
    .eq("active", true)
    .order("product_name");

  if (error) {
    console.error(
      "Production recipes error:",
      error
    );

    return {
      data: [],
      error: new Error(error.message),
    };
  }

  return {
    data: (data ?? []) as ProductionRecipe[],
    error: null,
  };
}
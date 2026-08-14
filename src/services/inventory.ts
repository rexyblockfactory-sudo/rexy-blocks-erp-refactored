import { supabase } from "@/lib/supabase/client";
import type {
  CreateInventoryInput,
  InventoryItem,
} from "@/types/inventory";

export async function getInventory() {
  return supabase
    .from("inventory")
    .select("*")
    .order("created_at", {
      ascending: false,
    });
}

export async function createInventoryItem(
  input: CreateInventoryInput
): Promise<{
  data: InventoryItem | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("inventory")
    .insert([
      {
        item_name: input.item_name,
        category: input.category,
        unit: input.unit,
        quantity: input.quantity,
        unit_cost: input.unit_cost,
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
    data: data as InventoryItem,
    error: null,
  };
}
import { supabase } from "@/lib/supabase/client";
import type {
  CreateInventoryInput,
  InventoryItem,
} from "@/types/inventory";

/**
 * Get all inventory items.
 */
export async function getInventory(): Promise<{
  data: InventoryItem[] | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("inventory")
    .select(
      "id, item_name, category, unit, quantity, unit_cost, created_at"
    )
    .order("item_name", {
      ascending: true,
    });

  if (error) {
    console.error("getInventory error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    return {
      data: null,
      error: new Error(error.message),
    };
  }

  const items = (data ?? []) as InventoryItem[];

  console.log(
    "getInventory loaded:",
    items.map((item) => ({
      id: item.id,
      item_name: item.item_name,
      quantity: item.quantity,
      unit: item.unit,
    }))
  );

  return {
    data: items,
    error: null,
  };
}
/**
 * Create a new inventory item with opening stock.
 *
 * The inventory row starts at quantity 0.
 * Opening stock is then recorded through the
 * inventory movement RPC so the quantity is
 * added exactly once and the movement is audited.
 */
export async function createInventoryItem(
  input: CreateInventoryInput
): Promise<{
  data: InventoryItem | null;
  error: Error | null;
}> {
  if (!input.item_name.trim()) {
    return {
      data: null,
      error: new Error("Item name is required."),
    };
  }

  if (!input.category.trim()) {
    return {
      data: null,
      error: new Error("Category is required."),
    };
  }

  if (!input.unit.trim()) {
    return {
      data: null,
      error: new Error("Unit is required."),
    };
  }

  if (
    !Number.isFinite(input.quantity) ||
    input.quantity < 0
  ) {
    return {
      data: null,
      error: new Error(
        "Quantity must be zero or greater."
      ),
    };
  }

  if (
    !Number.isFinite(input.unit_cost) ||
    input.unit_cost < 0
  ) {
    return {
      data: null,
      error: new Error(
        "Unit cost must be zero or greater."
      ),
    };
  }

  /*
   * Create the inventory row at ZERO quantity.
   *
   * The opening-stock movement below will add
   * the actual opening quantity exactly once.
   */
  const { data, error } = await supabase
    .from("inventory")
    .insert({
      item_name: input.item_name.trim(),
      category: input.category.trim(),
      unit: input.unit.trim(),
      quantity: 0,
      unit_cost: input.unit_cost,
    })
    .select()
    .single();

  if (error) {
    return {
      data: null,
      error: new Error(error.message),
    };
  }

  /*
   * Record opening stock.
   */
  if (input.quantity > 0) {
    const {
      data: movement,
      error: movementError,
    } = await supabase.rpc(
      "record_inventory_movement",
      {
        p_inventory_id: data.id,
        p_movement_type: "opening_stock",
        p_quantity: input.quantity,
        p_reason: "Opening stock",
      }
    );

    if (movementError || !movement) {
      /*
       * Remove the newly-created row if
       * opening stock could not be recorded.
       */
      await supabase
        .from("inventory")
        .delete()
        .eq("id", data.id);

      return {
        data: null,
        error: new Error(
          movementError?.message ??
            "Failed to record opening stock."
        ),
      };
    }
  }

  /*
   * Fetch the final row so the returned object
   * contains the actual inventory quantity.
   */
  const {
    data: finalData,
    error: finalError,
  } = await supabase
    .from("inventory")
    .select("*")
    .eq("id", data.id)
    .single();

  if (finalError) {
    return {
      data: null,
      error: new Error(finalError.message),
    };
  }

  return {
    data: finalData as InventoryItem,
    error: null,
  };
}

export async function getInventoryCosts(): Promise<{
  data: Record<string, number>;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("inventory")
    .select("item_name, unit_cost");

  if (error) {
    console.error(
      "Inventory cost error:",
      error
    );

    return {
      data: {},
      error: new Error(error.message),
    };
  }

  const costs: Record<string, number> = {};

  for (const item of data ?? []) {
    if (
      item.item_name &&
      item.unit_cost !== null
    ) {
      costs[item.item_name] =
        Number(item.unit_cost);
    }
  }

  return {
    data: costs,
    error: null,
  };
}
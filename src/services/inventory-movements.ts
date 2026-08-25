import { supabase } from "@/lib/supabase/client";
import type {
  CreateInventoryMovementInput,
  InventoryMovement,
} from "@/types/inventory-movement";

export async function getInventoryMovements() {
  return supabase
    .from("inventory_movements")
    .select("*")
    .order("created_at", {
      ascending: false,
    });
}

export async function recordInventoryMovement(
  input: CreateInventoryMovementInput
): Promise<{
  data: InventoryMovement | null;
  error: Error | null;
}> {
  if (!input.inventory_id) {
    return {
      data: null,
      error: new Error(
        "Inventory item is required."
      ),
    };
  }

  if (!input.movement_type) {
    return {
      data: null,
      error: new Error(
        "Movement type is required."
      ),
    };
  }

  if (
    !Number.isFinite(input.quantity) ||
    input.quantity <= 0
  ) {
    return {
      data: null,
      error: new Error(
        "Quantity must be greater than zero."
      ),
    };
  }

  const { data, error } =
    await supabase.rpc(
      "record_inventory_movement",
      {
        p_inventory_id:
          input.inventory_id,

        p_movement_type:
          input.movement_type,

        p_quantity:
          input.quantity,

        p_reason:
          input.reason?.trim() || null,
      }
    );

  if (error) {
    console.error(
      "record_inventory_movement error:",
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
        "Inventory movement was recorded, but no movement was returned."
      ),
    };
  }

  return {
    data: data as InventoryMovement,
    error: null,
  };
}
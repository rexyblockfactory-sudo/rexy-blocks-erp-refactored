export type InventoryMovementType =
  | "opening_stock"
  | "increase"
  | "decrease"
  | "damaged"
  | "broken"
  | "wastage"
  | "correction"
  | "other";

export interface InventoryMovement {
  id: string;
  inventory_id: string;
  item_name: string;
  movement_type: InventoryMovementType;
  quantity: number;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CreateInventoryMovementInput {
  inventory_id: string;
  movement_type: InventoryMovementType;
  quantity: number;
  reason?: string;
}
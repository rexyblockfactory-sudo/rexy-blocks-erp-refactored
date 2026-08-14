export interface InventoryItem {
  id: string;
  item_name: string;
  category: string;
  unit: string;
  quantity: number;
  unit_cost: number;
  created_at: string;
}

export interface CreateInventoryInput {
  item_name: string;
  category: string;
  unit: string;
  quantity: number;
  unit_cost: number;
}
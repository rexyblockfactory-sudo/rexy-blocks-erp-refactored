export interface DashboardLowStockItem {
  name: string;
  quantity: number;
}

export interface DashboardRecentSale {
  id: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  total_amount: number;
}

export interface DashboardProductionRecord {
  id: string;
  product_name: string;
  quantity: number;

  cement_used: number;
  chippings_used: number;
  quarry_dust_used: number;
  water_used: number;

  created_at: string;

  cement_unit_cost?: number | null;
  chippings_unit_cost?: number | null;
  quarry_dust_unit_cost?: number | null;
  water_unit_cost?: number | null;

  cement_cost?: number | null;
  chippings_cost?: number | null;
  quarry_dust_cost?: number | null;
  water_cost?: number | null;

  total_production_cost?: number | null;
  cost_per_block?: number | null;
}
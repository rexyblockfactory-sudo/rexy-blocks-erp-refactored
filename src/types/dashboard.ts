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
}

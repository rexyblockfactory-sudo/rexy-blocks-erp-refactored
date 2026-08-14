export interface ProductionRecord {
  id: string;
  product_name: string;
  quantity: number;
  cement_used: number;
  sand_used: number;
  quarry_dust_used: number;
  water_used: number;
  created_at: string;
}

export interface CreateProductionInput {
  product_name: string;
  quantity: number;
  cement_used: number;
  sand_used: number;
  quarry_dust_used: number;
  water_used: number;
}
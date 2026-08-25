export interface Production {
  id: string;

  product_name: string;

  quantity: number;

  cement_used: number;
  chippings_used: number;
  quarry_dust_used: number;
  water_used: number;

  created_at: string;

  cement_unit_cost: number;
  chippings_unit_cost: number;
  quarry_dust_unit_cost: number;
  water_unit_cost: number;

  cement_cost: number;
  chippings_cost: number;
  quarry_dust_cost: number;
  water_cost: number;

  total_production_cost: number;
  cost_per_block: number;
}

/*
 * Backward-compatible alias.
 *
 * Some existing pages still import ProductionRecord.
 * Keeping this alias prevents unnecessary changes
 * throughout the application.
 */
export type ProductionRecord = Production;

export interface CreateProductionInput {
  product_name: string;

  quantity: number;

  cement_used: number;
  chippings_used: number;
  quarry_dust_used: number;
  water_used: number;
}
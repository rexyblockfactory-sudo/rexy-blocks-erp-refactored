export interface Sale {
  id: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: string;
  created_at: string;
}

export interface CreateSaleInput {
  customer_name: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  payment_method: string;
}
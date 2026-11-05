export interface Sale {
  id: string;

  customer_name: string;

  product_name: string;

  quantity: number;

  unit_price: number;

  total_amount: number;

  delivery_charge?: number;
  additional_charges?: number;

  payment_method: string;

  amount_paid: number;

  balance_due: number;

  /**
   * Cost of goods sold for this sale.
   */
  cogs?: number | null;

  /**
   * Gross profit for this sale.
   */
  gross_profit?: number | null;

  /**
   * Profit alias used by some parts of the application.
   */
  profit?: number | null;

  created_at: string;
}

export interface CreateSaleInput {
  customer_name: string;

  product_id: string;

  quantity: number;

  payment_method: string;
}
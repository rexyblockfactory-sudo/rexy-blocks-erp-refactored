export interface Customer {
  id: string;
  customer_name: string;
  phone: string | null;
  address: string | null;
  customer_type: string | null;
  balance: number;
  created_at: string;
}

export interface CreateCustomerInput {
  customer_name: string;
  phone?: string;
  address?: string;
  customer_type: string;
  balance: number;
}
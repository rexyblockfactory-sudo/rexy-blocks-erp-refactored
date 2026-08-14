import { supabase } from "@/lib/supabase/client";
import type {
  CreateCustomerInput,
  Customer,
} from "@/types/customer";

export async function getCustomers() {
  return supabase
    .from("customers")
    .select("*")
    .order("customer_name");
}

export async function createCustomer(
  input: CreateCustomerInput
): Promise<{
  data: Customer | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("customers")
    .insert([
      {
        customer_name: input.customer_name,
        phone: input.phone || null,
        address: input.address || null,
        customer_type: input.customer_type,
        balance: input.balance,
      },
    ])
    .select()
    .single();

  if (error) {
    return {
      data: null,
      error: new Error(error.message),
    };
  }

  return {
    data: data as Customer,
    error: null,
  };
}
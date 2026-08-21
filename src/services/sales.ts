import { supabase } from "@/lib/supabase/client";
import type { CreateSaleInput, Sale } from "@/types/sale";

export async function getSales() {
  return supabase
    .from("sales")
    .select("*")
    .order("created_at", {
      ascending: false,
    });
}

export async function getRecentSales(limit = 5) {
  return supabase
    .from("sales")
    .select("*")
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);
}

export async function createSale(
  input: CreateSaleInput & {
    product_id?: string;
  }
): Promise<{
  data: Sale | null;
  error: Error | null;
}> {
  if (!input.product_id) {
    return {
      data: null,
      error: new Error(
        "A product ID is required to create a sale."
      ),
    };
  }

  const { data, error } = await supabase.rpc(
    "create_sale_with_current_price",
    {
      p_customer_name: input.customer_name,
      p_product_id: input.product_id,
      p_quantity: input.quantity,
      p_payment_method: input.payment_method,
    }
  );

  if (error) {
    return {
      data: null,
      error: new Error(error.message),
    };
  }

  return {
    data: data as Sale,
    error: null,
  };
}
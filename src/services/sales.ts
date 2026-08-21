import { supabase } from "@/lib/supabase/client";
import type {
  CreateSaleInput,
  Sale,
} from "@/types/sale";

/**
 * Get all sales.
 */
export async function getSales(): Promise<{
  data: Sale[] | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    return {
      data: null,
      error: new Error(error.message),
    };
  }

  return {
    data: (data || []) as Sale[],
    error: null,
  };
}

/**
 * Get one sale by ID.
 */
export async function getSale(
  saleId: string
): Promise<{
  data: Sale | null;
  error: Error | null;
}> {
  if (!saleId) {
    return {
      data: null,
      error: new Error(
        "Sale ID is required."
      ),
    };
  }

  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .eq("id", saleId)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: new Error(error.message),
    };
  }

  if (!data) {
    return {
      data: null,
      error: new Error(
        "Sale was not found."
      ),
    };
  }

  return {
    data: data as Sale,
    error: null,
  };
}

/**
 * Create a new sale using the current
 * product price stored in the database.
 *
 * The database function is authoritative for:
 * - product price
 * - total amount
 * - inventory deduction
 * - invoice creation
 * - initial payment/balance
 */
export async function createSale(
  input: CreateSaleInput
): Promise<{
  data: Sale | null;
  error: Error | null;
}> {
  if (!input.customer_name?.trim()) {
    return {
      data: null,
      error: new Error(
        "Customer name is required."
      ),
    };
  }

  if (!input.product_id) {
    return {
      data: null,
      error: new Error(
        "Product is required."
      ),
    };
  }

  if (
    !Number.isInteger(input.quantity) ||
    input.quantity <= 0
  ) {
    return {
      data: null,
      error: new Error(
        "Quantity must be a positive whole number."
      ),
    };
  }

  if (!input.payment_method?.trim()) {
    return {
      data: null,
      error: new Error(
        "Payment method is required."
      ),
    };
  }

  const { data, error } =
    await supabase.rpc(
      "create_sale_with_current_price",
      {
        p_customer_name:
          input.customer_name.trim(),

        p_product_id:
          input.product_id,

        p_quantity:
          input.quantity,

        p_payment_method:
          input.payment_method.trim(),
      }
    );

  if (error) {
    console.error(
      "create_sale_with_current_price error:",
      error
    );

    return {
      data: null,
      error: new Error(error.message),
    };
  }

  if (!data) {
    return {
      data: null,
      error: new Error(
        "Sale was created, but no sale record was returned."
      ),
    };
  }

  return {
    data: data as Sale,
    error: null,
  };
}

/**
 * Record a payment against an existing sale.
 *
 * Database responsibilities:
 * - authentication
 * - authorization
 * - sale locking
 * - payment validation
 * - overpayment prevention
 * - sale_payments insertion
 * - amount_paid update
 * - balance_due update
 * - invoice payment status synchronization
 */
export async function recordSalePayment(
  saleId: string,
  amount: number,
  paymentMethod: string,
  reference?: string,
  notes?: string
): Promise<{
  data: Sale | null;
  error: Error | null;
}> {
  if (!saleId) {
    return {
      data: null,
      error: new Error(
        "Sale ID is required."
      ),
    };
  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return {
      data: null,
      error: new Error(
        "Payment amount must be greater than zero."
      ),
    };
  }

  if (!paymentMethod?.trim()) {
    return {
      data: null,
      error: new Error(
        "Payment method is required."
      ),
    };
  }

  const { data, error } =
    await supabase.rpc(
      "record_sale_payment",
      {
        p_sale_id: saleId,
        p_amount: amount,
        p_payment_method:
          paymentMethod.trim(),
        p_reference:
          reference?.trim() || null,
        p_notes:
          notes?.trim() || null,
      }
    );

  if (error) {
    console.error(
      "record_sale_payment error:",
      error
    );

    return {
      data: null,
      error: new Error(error.message),
    };
  }

  if (!data) {
    return {
      data: null,
      error: new Error(
        "Payment was recorded, but no updated sale was returned."
      ),
    };
  }

  return {
    data: data as Sale,
    error: null,
  };
}

/**
 * Get individual payments for a sale.
 */
export async function getSalePayments(
  saleId: string
) {
  if (!saleId) {
    return {
      data: null,
      error: new Error(
        "Sale ID is required."
      ),
    };
  }

  return supabase
    .from("sale_payments")
    .select(
      `
        id,
        sale_id,
        amount,
        payment_method,
        reference,
        notes,
        created_by,
        created_at
      `
    )
    .eq("sale_id", saleId)
    .order("created_at", {
      ascending: false,
    });
}

/**
 * Delete a sale.
 */
export async function deleteSale(
  saleId: string
): Promise<{
  data: Sale | null;
  error: Error | null;
}> {
  if (!saleId) {
    return {
      data: null,
      error: new Error(
        "Sale ID is required."
      ),
    };
  }

  const { data, error } = await supabase
    .from("sales")
    .delete()
    .eq("id", saleId)
    .select()
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: new Error(error.message),
    };
  }

  if (!data) {
    return {
      data: null,
      error: new Error(
        "Sale was not found or could not be deleted."
      ),
    };
  }

  return {
    data: data as Sale,
    error: null,
  };
}